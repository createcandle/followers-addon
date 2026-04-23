"""Followers API handler."""



import os
import sys

sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'lib'))
import json
import time
import uuid
from time import sleep
import base64
import random
import requests
import websocket
#import websocket-client
import threading

from types import MethodType

import asyncio
#import websockets
import ssl



#from websockets.asyncio.client import connect

try:
    from gateway_addon import APIHandler, APIResponse, Database, AddonManagerProxy
    #print("succesfully loaded APIHandler and APIResponse from gateway_addon")
except:
    print("Import APIHandler and APIResponse from gateway_addon failed. Use at least WebThings Gateway version 0.10")
    sys.exit(1)

from .followers_adapter import *


_TIMEOUT = 3

_CONFIG_PATHS = [
    os.path.join(os.path.expanduser('~'), '.webthings', 'config'),
]

if 'WEBTHINGS_HOME' in os.environ:
    _CONFIG_PATHS.insert(0, os.path.join(os.environ['WEBTHINGS_HOME'], 'config'))




"""
class FollowersProxy(AddonManagerProxy):

    def __init__(self, plugin_id, verbose,test=1,test2=1):
        print("in FollowersProxy init. proxy_id: ", plugin_id)

        self.verbose = verbose
        self.plugin_id = proxy_id

        self.ready = False
        self.extra_proxy_name = 'follower_extra_proxy'
        self.DEBUG = False
        self.name = self.__class__.__name__
        AddonManagerProxy.__init__(self, plugin_id=plugin_id, verbose=verbose, test=1,test2=2)
        #super(AddonManagerProxy, self).__init__(plugin_id=plugin_id, verbose=verbose)


    def on_message(self, msg):
        if self.verbose:
            print('EXTEA FollowersProxy: recv:', msg)

        msg_type = msg['messageType']
"""


class FollowersAPIHandler(APIHandler):
    """Followers API handler."""

    def __init__(self, verbose=False):
        """Initialize the object."""
        #print("INSIDE API HANDLER INIT")

        #print("\n\n\nF O L L O W E R S")

        self.addon_name = 'followers'
        self.running = True
        self.ready = False

        self.api_server = 'http://127.0.0.1:8080'
        self.DEBUG = False

        self.things = [] # Holds all the things, updated via the API. Used to display a nicer thing name instead of the technical internal ID.
        self.data_types_lookup_table = {}
        self.seconds = 0
        self.minutes = 0
        self.error_counter = 0
        self.there_are_missing_properties = False
        self.ignore_missing_properties = False
        self.got_good_things_list = False
        self.api_seems_down = False

        self.should_save = False
        self.initial_connection_made = False

        self.websockets = {}
        self.websocket_threads = {}
        
        self.greyscale = False;
        self.screensaver_scroll = True


        # LOAD CONFIG
        try:
            self.add_from_config()
        except Exception as ex:
            print("caught error loading config: " + str(ex))

        #self.DEBUG = False



        #self.DEBUG = True

        # Respond to gateway version
        try:
            if self.DEBUG:
                print("Gateway version: " + str(self.gateway_version))
        except:
            if self.DEBUG:
                print("self.gateway_version did not exist")




        # Paths
        # Get persistent data
        try:
            self.persistence_file_path = os.path.join(self.user_profile['dataDir'], self.addon_name, 'persistence.json')
            #print("self.persistence_file_path: ", self.persistence_file_path)
            if not os.path.isdir(self.persistence_file_path):
                os.mkdir(self.persistence_file_path)
        except:
            try:
                if self.DEBUG:
                    print("setting persistence file path failed, will try older method.")
                self.persistence_file_path = os.path.join(os.path.expanduser('~'), '.webthings', 'data', self.addon_name,'persistence.json')
            except:
                if self.DEBUG:
                    print("Double error making persistence file path")
                self.persistence_file_path = "/home/pi/.webthings/data/" + self.addon_name + "/persistence.json"

        if self.DEBUG:
            print("Current working directory: " + str(os.getcwd()))


        first_run = False
        try:
            #print("self.persistence_file_path: " + str(self.persistence_file_path))
            with open(self.persistence_file_path) as f:
                self.persistent_data = json.load(f)
                if self.DEBUG:
                    print("Persistence data was loaded succesfully.")

        except Exception as ex:
            first_run = True
            print("Could not load persistent data (if you just installed the add-on then this is normal). " + str(ex))
            self.persistent_data = {'items':[]}

        if self.DEBUG:
            print("self.persistent_data is now: " + str(self.persistent_data))


        if not 'token' in self.persistent_data:
            self.persistent_data['token'] = None

        if not 'items' in self.persistent_data:
            self.persistent_data['items'] = []

        if not 'variables' in self.persistent_data:
            self.persistent_data['variables'] = {}

        if not 'websocket_host' in self.persistent_data:
            self.persistent_data['websocket_host'] = 'localhost'

        #self.persistent_data['websocket_host'] = 'localhost'

        if not 'websocket_port' in self.persistent_data:
            self.persistent_data['websocket_port'] = 8080

        # Is there user profile data?
        #try:
        #    print(str(self.user_profile))
        #except:
        #    print("no user profile data")

        #print("__>")
        #print("self.persistent_data: ", str(self.persistent_data))

        # The python 3 equivalent for z.q = new.instancemethod(method, z, None) is z.q = types.MethodType(method, z). Remember to import types instead of new.

        #def new_m(self,message):
        #    resp = json.loads(message)

        #a.m = MethodType(new_m, a)

        if len(str(self.persistent_data['websocket_host'])) < 2:
           self.persistent_data['websocket_host'] = 'localhost'

        if len(str(self.persistent_data['websocket_port'])) == 0:
           self.persistent_data['websocket_port'] = 8080


        self.api_server = 'http://' + str(self.persistent_data['websocket_host']) + ':' + str(self.persistent_data['websocket_port'])



        # Intiate extension addon API handler
        try:
            manifest_fname = os.path.join(
                os.path.dirname(__file__),
                '..',
                'manifest.json'
            )

            with open(manifest_fname, 'rt') as f:
                manifest = json.load(f)

            APIHandler.__init__(self, manifest['id'])
            self.manager_proxy.add_api_handler(self)


            if self.DEBUG:
                print("self.manager_proxy = " + str(self.manager_proxy))
                print("Created new API HANDLER: " + str(manifest['id']))

        except Exception as ex:
            if self.DEBUG:
                print("\nERROR, failed to init UX extension API handler: " + str(ex))


        self.things = {}
        self.simple_things = {}

        # Give the addons time to create all devices
        #if not self.DEBUG:
        #    sleep(20)

        if self.DEBUG:
            print("getting the simple things list")
        self.update_simple_things()



        self.adapter = None
        try:
            self.adapter = FollowersAdapter(self,verbose=False)
            if self.DEBUG:
                print("debug: ADAPTER created")
        except Exception as ex:
            print("\ncaught ERROR creating adapter: " + str(ex))







        # Start the internal clock

        if self.DEBUG:
            print("Starting the internal clock")
        try:
            if self.persistent_data['token'] != None:
                t = threading.Thread(target=self.clock)
                t.daemon = True
                t.start()
        except:
            print("Error starting the clock thread")


        #self.ws_thing_id = "internet-radio"
        """
        if 'token' in self.persistent_data and len(str(self.persistent_data['token'])) > 10:
            print("token present")
            #ws_url = 'ws://localhost:8080/things/' + str(self.ws_thing_id) + '?jwt=' + str(self.persistent_data['token']) # /properties/power
            self.start_websocket(self.ws_thing_id)
        else:
            print("no jwt token in persistent data")
        """
        self.ready = True



    # Read the settings from the add-on settings page
    def add_from_config(self):
        """Attempt to read config data."""
        try:
            database = Database(self.addon_name)
            if not database.open():
                print("Could not open settings database")
                return

            config = database.load_config()
            database.close()

        except Exception as ex:
            print("Error! Failed to open settings database: " + str(ex))
            self.close_proxy()

        if not config:
            print("Error loading config from database")
            return



        # Debug
        if 'Debugging' in config:
            self.DEBUG = bool(config['Debugging'])
            if self.DEBUG:
                print("-Debugging preference was in config: " + str(self.DEBUG))

        # Api token
        try:
            if 'Authorization token' in config:
                if len(str(config['Authorization token'])) > 10:
                    self.persistent_data['token'] = str(config['Authorization token'])
                else:
                    if self.DEBUG:
                        print("-Authorization token is present in the config data, but too short")

            if 'Websocket host' in config:
                if len(str(config['Websocket host'])) > 3:
                    self.persistent_data['websocket_host'] = str(config['Websocket host'])

            if 'Websocket port' in config:
                if len(str(config['Host name'])) > 1:
                    self.persistent_data['websocket_port'] = int(config['Websocket port'])

            if 'Show screensaver in black and white' in config:
                self.greyscale = bool(config['Show screensaver in black and white'])
                if self.DEBUG:
                    print("-Show screensaver in black and white preference was in config: " + str(self.greyscale))
            
            if 'Disable screensaver auto-scroll' in config:
                self.screensaver_scroll = not bool(config['Disable screensaver auto-scroll'])
                if self.DEBUG:
                    print("-Disable screensaver auto-scroll preference was in config: " + str(self.screensaver_scroll))
                    
            # Ignore missing properties?
            if 'Ignore missing properties' in config:
                self.ignore_missing_properties = bool(config['Ignore missing properties'])
                if self.DEBUG:
                    print("-Ignore missing properties preference was in config: " + str(self.ignore_missing_properties))

        except Exception as ex:
            if self.DEBUG:
                print("caught error loading api token from settings: ", ex)


        







#
#  CLOCK
#

    def clock(self):
        """ Runs every second """
        #print("in clock. self.running: ", self.running)
        previous_action_times_count = 0
        #previous_injection_time = time.time()
        enabled_count = len(self.persistent_data['items'])

        previous_timestamp = 0

        while self.running:

            current_timestamp = int(time.time())

            if current_timestamp == previous_timestamp:
                time.sleep(.1)
            else:
                previous_timestamp = current_timestamp
                #if self.DEBUG:
                #    print(" ")
                #    print("TICK")
                #    print("previous_timestamp: " + str(previous_timestamp))
                #    print("self.got_good_things_list: ", self.got_good_things_list)
                #    print("self.initial_connection_made: ", self.initial_connection_made)
                try:
                    if self.got_good_things_list:

                        if self.initial_connection_made == False:
                            #if self.DEBUG:
                            #    print("self.initial_connection_made: ", self.initial_connection_made)
                            if 'token' in self.persistent_data and len(str(self.persistent_data['token'])) > 10:
                                self.initial_connection_made = True
                                if self.DEBUG:
                                    print("clock: doing connect_to_all_things")
                                self.connect_to_all_things()
                                if self.DEBUG:
                                    print("clock: connect_to_all_things is done")
                                self.ready = True

                    if self.should_save:
                        if self.DEBUG:
                            print("clock: should_save is True")
                        self.should_save = False
                        self.save_persistent_data()

                    
                    for index, unique_id in enumerate(self.persistent_data['variables']):
                        if 'enabled' in self.persistent_data['variables'][unique_id] and isinstance(self.persistent_data['variables'][unique_id]['enabled'],bool) and self.persistent_data['variables'][unique_id]['enabled'] == True:
                            #if self.DEBUG:
                            #    print("clock: enabled variable: ", unique_id)
                            for index2, trigger_id in enumerate(self.persistent_data['variables'][unique_id]['triggers']):
                                if 'type' in self.persistent_data['variables'][unique_id]['triggers'][trigger_id] and self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['type'] == 'time':
                                    #print("clock: checking time trigger")
                                    if 'time_delta' in self.persistent_data['variables'][unique_id]['triggers'][trigger_id] and 'time_delta_multiplier' in self.persistent_data['variables'][unique_id]['triggers'][trigger_id] and isinstance(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['time_delta'],str) and isinstance(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['time_delta_multiplier'],str):
                                        try:
                                            multiplied_delta = int(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['time_delta']) * int(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['time_delta_multiplier'])
                                            #print("clock: multiplied_delta: ", multiplied_delta)
                                            if multiplied_delta > 0:
                                                if current_timestamp % multiplied_delta == 0:
                                                    if self.DEBUG:
                                                        print("clock: NOW! performing time trigger for unique_id: ", unique_id)
                                                    self.update_variable(unique_id,trigger_id)
                                        except Exception as ex:
                                            if self.DEBUG:
                                                print("clock: caught error calculating time trigger time_delta: ", ex)


                except Exception as ex:
                    if self.DEBUG:
                        print("caught general clock error: " + str(ex))
                        print("Error on line {}".format(sys.exc_info()[-1].tb_lineno))
        
        #if self.DEBUG:
        #    print("Clock: beyond while loop")

     
                            



    def update_simple_things(self):
        if self.DEBUG:
            print("in update_simple_things")
        try:
            fresh_things = self.api_get("/things")
            if self.DEBUG:
                print("- Did the things API call.")
                #print(str(self.things))

            if hasattr(fresh_things, 'error'):
                if self.DEBUG:
                    print("try_update_things: get_api returned an error.")

                if fresh_things['error'] == '403':
                    if self.DEBUG:
                        print("Spotted 403 error, will try to switch to https API calls")
                    self.api_server = 'https://127.0.0.1:4443'
                    #fresh_things = self.api_get("/things")
                    #if self.DEBUG:
                        #print("Tried the API call again, this time at port 4443. Result: " + str(fresh_things))
                return

            self.things = fresh_things

            #print("update_simple_things: self.things: ", self.things)
        except Exception as ex:
            if self.DEBUG:
                print("Error getting things from API: " + str(ex))


        try:
            new_simple_things = {}
            #print("self.things length: ",len(self.things))

            for thing in self.things:
                #if self.DEBUG:
                #    print("* thing = "  + str(thing))

                try:
                    thing_id = str(thing['id'].rsplit('/', 1)[-1])
                    #if self.DEBUG:
                    #    print("thing_id = "  + str(thing_id))

                    new_simple_things[thing_id] = []

                    if 'properties' in thing:
                        for thing_property_key in thing['properties']:
                            #print("-thing_property_key = " + str(thing_property_key))

                            try:
                                found_forms = False
                                if 'forms' in thing['properties'][thing_property_key].keys():
                                    if len(thing['properties'][thing_property_key]['forms']) > 0:
                                        property_id = thing['properties'][thing_property_key]['forms'][0]['href'].rsplit('/', 1)[-1]
                                        found_forms = True

                                if found_forms == False:
                                    if 'links' in thing['properties'][thing_property_key].keys():
                                        if len(thing['properties'][thing_property_key]['links']) > 0:
                                            property_id = thing['properties'][thing_property_key]['links'][0]['href'].rsplit('/', 1)[-1]


                                #if self.DEBUG:
                                #    print("property_id = " + str(property_id))

                            except Exception as ex:
                                if self.DEBUG:
                                    print("caught error extracting links/forms: " + str(ex))
                            # all that trouble.. what is property_id used for?

                            new_simple_things[thing_id].append(thing_property_key)


                except Exception as ex:
                    print("caught error parsing to simple_things: " + str(ex))

            self.simple_things = new_simple_things
            self.got_good_things_list = True
            if self.DEBUG:
                print("- self.simple_things is now: " + str(self.simple_things))
                print("self.got_good_things_list: ", self.got_good_things_list)

            if self.got_good_things_list and self.initial_connection_made == False and 'token' in self.persistent_data and len(str(self.persistent_data['token'])) > 10:
                self.initial_connection_made = True
                self.connect_to_all_things()
                self.ready = True

        except Exception as ex:
            if self.DEBUG:
                print("Error parsing to simple_things: " + str(ex))


    def connect_to_all_things(self):
        try:

            #print("in connect_to_all_things.   self.persistent_data['items']: " + str(self.persistent_data['items']))
            for index, item in enumerate(self.persistent_data['items']):

                if 'thing1' in item and str(item['thing1']) not in self.websockets.keys():
                    if self.DEBUG:
                        print("calling start_websocket for Followers thing: ", item['thing1'])
                    self.start_websocket(item['thing1'])
                #else:
                #    print("thing already in self.websockets: ", item['thing1'])

            for index, unique_id in enumerate(self.persistent_data['variables']):
                for index2, trigger_id in enumerate(self.persistent_data['variables'][unique_id]['triggers']):
                    if 'thing1' in self.persistent_data['variables'][unique_id]['triggers'][trigger_id] and isinstance(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1'],str):
                        thing_id = str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1'])
                        if len(thing_id) > 1 and thing_id not in self.websockets.keys():
                            if self.DEBUG:
                                print("calling start_websocket for Variables trigger thing_id: ", thing_id)
                            self.start_websocket(thing_id)


        except Exception as ex:
            if self.DEBUG:
                print("caught error in connect_all_things: ", ex)






    def start_websocket(self,device_id):

        if self.DEBUG:
            print("in start_websocket.  device_id: ", device_id)

        def on_ws_open(ws):
            if self.DEBUG:
                print("websocket opened")


        def on_ws_message(ws, message):
            if self.DEBUG:
                print("received websocket message: ", str(message))
            try:

                message = json.loads(message)
                if str(message['messageType']) == "propertyStatus":
                    self.handle_ws_update(message)


            except Exception as ex:
                if self.DEBUG:
                    print("caught an error in on_ws_message: ", ex)



        def on_ws_close(ws,close_status_code, close_msg):
            if self.DEBUG:
                print("closed websocket connection.  close_status_code, close_msg: ", close_status_code, close_msg)


        def on_ws_error(ws,err):
            if self.DEBUG:
                print("websocket ERROR: ", err)

            if device_id in self.websockets.keys():
                if self.DEBUG:
                    print("will delete the websocket with device_id: ", device_id)
                del self.websockets[device_id]
            else:
                if self.DEBUG:
                    print("error, device_id not in self.websockets?: ", device_id)


        ws_url = 'ws://' + str(self.persistent_data['websocket_host']) + ':' + str(self.persistent_data['websocket_port']) + '/things/' + str(device_id) + '?jwt=' + str(self.persistent_data['token'])

        if self.DEBUG:
            print("ws_url: ", ws_url)


        websocket_headers = {
                    'Accept':'application/json',
                    'Authorization':'Bearer ' + str(self.persistent_data['token'])
                    }

        try:
            self.websockets[device_id] = websocket.WebSocketApp(ws_url,
                                header=websocket_headers,
                                #cookie="; ".join(["%s=%s" %(i, j) for i, j in cookies.items()]),
                                on_open=on_ws_open,
                                on_message=on_ws_message,
                                on_close=on_ws_close,
                                on_error=on_ws_error,
                                subprotocols=["webthing"] # ,"webthingprotocol
                        )

            self.websocket_threads[device_id] = threading.Thread(target=lambda: self.websockets[device_id].run_forever())
            self.websocket_threads[device_id].daemon = True
            self.websocket_threads[device_id].start()

        except Exception as ex:
            if self.DEBUG:
                print("caught error starting websock: ", ex)



    def handle_ws_update(self,message):
        if self.DEBUG:
            print("in handle_ws_update. message: ", json.dumps(message,indent=4))

        # {"id":"internet-radio","messageType":"propertyStatus","data":{"volume":69}}
        for index, item in enumerate(self.persistent_data['items']):
            #print("\nhandle_ws_update: " + str(index) + ".")
            #print("self.persistent_data['items'][index]: ", self.persistent_data['items'][index])
            #print("handle_ws_update: item: ", item)

            #print("handle_ws_update: item thing1: ", item['thing1'])

            # {"id":"internet-radio","messageType":"propertyStatus","data":{"volume":69}}

            message_property = None
            if 'data' in message.keys() and 'enabled' in item.keys():
                #print("message['data'].keys(), len(message['data'].keys(): ", len(message['data'].keys()), message['data'].keys() )
                if len(message['data'].keys()):

                    message_property = str(list(message['data'].keys())[0] )
                    #print("message_property: ", message_property, " =?= ", str(item['property1']))

                    if item['enabled'] == True and str(item['thing1']) == str(message['id']):
                        if 'data' in message.keys() and str(item['property1']) == str(message_property):
                            if self.DEBUG:
                                print("handle_ws_update: got relevant property!: ", str(item['property1']))
                            self.set_property_value(index, message['data'][str(message_property)])


        for index, unique_id in enumerate(self.persistent_data['variables']):
            #print("\nhandle_ws_update: " + str(index) + ".")
            #print("self.persistent_data['items'][index]: ", self.persistent_data['items'][index])
            if self.DEBUG:
                print("handle_ws_update: variables:  index,unique_id: ", index, unique_id)

            #print("handle_ws_update: item thing1: ", item['thing1'])

            # {"id":"internet-radio","messageType":"propertyStatus","data":{"volume":69}}

            message_property = None
            if 'data' in message.keys() and 'enabled' in self.persistent_data['variables'][unique_id].keys():
                #print("message['data'].keys(), len(message['data'].keys(): ", len(message['data'].keys()), message['data'].keys() )
                if len(message['data'].keys()):
                    message_property = str(list(message['data'].keys())[0] )
                    if self.DEBUG:
                        print("message_property: ", message_property)

                    if self.persistent_data['variables'][unique_id]['enabled'] == True:
                        for index, trigger_id in enumerate(self.persistent_data['variables'][unique_id]['triggers']):
                            try:
                                if 'thing1' in self.persistent_data['variables'][unique_id]['triggers'][trigger_id] and isinstance(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1'],str):
                                    #if self.DEBUG:
                                    #    print("TRIGGER THING ID MATCH? ", str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1']), " =?= ", str(message['id']))
                                    if str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1']) == str(message['id']):
                                        if 'data' in message.keys() and str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['property1']) == str(message_property):
                                            if self.DEBUG:
                                                print("handle_ws_update: got relevant property for variable.  \n- unique_id,trigger_id: ", unique_id, trigger_id, "\n- thing-property: ", str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1']), str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['property1']), "\n- message: ", message)
                                            self.update_variable(unique_id, trigger_id, message)


                            except Exception as ex:
                                if self.DEBUG:
                                    print("\ncaught error checking variables trigger for match with incoming message: ", ex)
                            


    # new method for websocket listener
    def set_property_value(self, items_index, original_value):

        try:
            if items_index < len(self.persistent_data['items']):
                item = self.persistent_data['items'][items_index]

                # If the value we received is within tolerances, then we calculate the value that the second property should be set to
                if min(float(item['limit1']), float(item['limit2'])) <= float(original_value) <= max(float(item['limit1']), float(item['limit2'])):
                    output = translate(original_value, item['limit1'], item['limit2'], item['limit3'], item['limit4'])
                    if self.DEBUG:
                        print("set_property_value: got translated output: " + str(output))

                    if 'previous_value' not in item:
                        item['previous_value'] = None # We remember the previous value that was sent to the second device. If we sent it before, we don't resend it, to avoid overwhelming the API. TODO: makes more sense to check if the previous input was the same as the result? Although I guess this has the same effect.

                    # Figure out what type of variable it is: integer or float
                    try:
                        numeric_value = get_int_or_float(output)
                        #print("initial numeric_value = " + str(numeric_value))
                        if 'property2_type' in item:
                            if str(item['property2_type']) == 'integer':
                                numeric_value = round(numeric_value)
                        else:

                            if self.DEBUG:
                                print("property2_type int or float type was not in item, falling back to get_int_or_float")

                            #temporary fix, as sending floats to percentage properties doesn't work properly.
                            numeric_value = round(numeric_value)

                    except Exception as ex:
                        if self.DEBUG:
                            print("Error turning into int: " + str(ex))
                        return


                    if not 'previous_value' in self.persistent_data['items'][items_index]:
                        self.persistent_data['items'][items_index]['previous_value'] = None


                    if str(item['previous_value']) == str(numeric_value):
                        if self.DEBUG:
                            print("current value was already set, will not do PUT")
                    else:

                        try:
                            if self.DEBUG:
                                print("new value for: " + str(item['thing2']) + " - " + str(item['property2']) + ", will update this numeric_value via API: " + str(numeric_value))


                            data_to_put = {}
                            data_to_put[str(item['property2'])] = numeric_value
                            if self.DEBUG:
                                print("data_to_put = " + str(data_to_put))

                            api_put_result = self.api_put( '/things/' + str(item['thing2']) + '/properties/' + str(item['property2']), data_to_put )
                            time.sleep(.02)
                            #attempted_connections += 1

                            try:
                                key = list(api_put_result.keys())[0]
                                if key == "error":
                                    api_error_spotted += 1

                                    if self.DEBUG:
                                        print("api_put_result['error'] = " + str(api_put_result[key]))
                                    if api_put_result[key] == 500:
                                        if self.DEBUG:
                                            print("API PUT failed with a 500 server error.")
                                        if self.ignore_missing_properties == False:
                                            self.error_counter += 2

                                else:
                                    # updating the property to the new value worked
                                    #print("updating the property to the new value worked")

                                    self.persistent_data['items'][items_index]['previous_value'] = numeric_value


                            except Exception as ex:
                                if self.DEBUG:
                                    print("Error while checking if PUT was succesful: " + str(ex))

                        except Exception as ex:
                            print("Error late in putting via API: " + str(ex))

                else:
                    if self.DEBUG:
                        print("input was out of bounds")
            else:
                if self.DEBUG:
                    print("item no longer in persistent data?")

        except Exception as ex:
            if self.DEBUG:
                print("caught error in set_property_value: ", ex)



    # , str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['thing1']), str(self.persistent_data['variables'][unique_id]['triggers'][trigger_id]['property1']), message['data'][str(message_property)]
    def update_variable(self, unique_id, trigger_id, message={}):   #thing_id, property_id, value):
        if self.DEBUG:
            #print("in update_variable.  unique_id, trigger_id, thing_id, property_id, value: ", unique_id, trigger_id, thing_id, property_id, value)
            print("in update_variable.  unique_id, trigger_id, message: ", unique_id, trigger_id, message)

        try:
            item = self.persistent_data['variables'][unique_id]
            trigger = self.persistent_data['variables'][unique_id]['triggers'][trigger_id]
            if self.DEBUG:
                print("update_variable: MESSAGE: \n", json.dumps(message,indent=4))
                print("update_variable: FULL TRIGGER: \n", json.dumps(trigger,indent=4))

            if not 'value' in self.persistent_data['variables'][unique_id]:
                self.persistent_data['variables'][unique_id]['value'] = float(self.persistent_data['variables'][unique_id]['limit1'])

            initial_value = float(self.persistent_data['variables'][unique_id]['value'])
            received_value = initial_value

            value_change = 0
            if 'amount' in trigger:
                value_change = float(trigger['amount'])


            if trigger['type'] == 'property':
                
                property_id = trigger['property1']
                if 'data' in message and property_id in message['data']:
                    received_value = message['data'][property_id]
                else:
                    if self.DEBUG:
                        print("error, failed to get value from received message")
                    return
            
                if self.DEBUG:
                    print("update_variable: received_value: ", received_value)

                # Boolean filter
                if trigger['property1_type'] == 'boolean':
                    if trigger['boolean_change'] == 'switches_on' and bool(received_value) == False:
                        if self.DEBUG:
                            print("update_variable: skipping because boolean state was not 'switches_on'")
                        return
                    if trigger['boolean_change'] == 'switches_off' and bool(received_value) == True:
                        if self.DEBUG:
                            print("update_variable: skipping because boolean state was not 'switches_off'")
                        return

                # Number filter
                elif trigger['property1_type'] == 'integer' or trigger['property1_type'] == 'float' or trigger['property1_type'] == 'number':
                    if trigger['number_change'] == 'happens_and_is' and str(received_value) != str(trigger['change_value']):
                        if self.DEBUG:
                            print("update_variable: skipping because value was not the value of 'happens_and_is'")
                        return
                    elif trigger['number_change'] == 'happens_and_is_not' and str(received_value) == str(trigger['change_value']):
                        if self.DEBUG:
                            print("update_variable: skipping because value was the value of 'happens_and_is_not'")
                        return
                    elif trigger['number_change'] == 'happens_above' and float(received_value) < float(trigger['change_value']):
                        if self.DEBUG:
                            print("update_variable: skipping because value was below the value of 'happens_and_above'")
                        return
                    elif trigger['number_change'] == 'happens_below' and float(received_value) > float(trigger['change_value']):
                        if self.DEBUG:
                            print("update_variable: skipping because value was above the value of 'happens_and_below'")
                        return
                    
                    if trigger['by'] == 'by_its_value':
                        value_change = received_value

                # String filter
                elif trigger['property1_type'] == 'string' or trigger['property1_type'] == 'enum':
                    if trigger['string_change'] == 'becomes' and str(received_value) == str(self.persistent_data['variables'][unique_id]['value']):
                        if self.DEBUG:
                            print("update_variable: skipping because string was already this value, so 'becomes' does not apply")
                        return

            # No filters for time triggers



            if self.DEBUG:
                print("\n\n\nvalue_change: ", value_change, "\n\n\n")
            
                print("self.adapter.thing: ", self.adapter.thing)
                print("self.adapter.thing.properties: ", self.adapter.thing.properties)

            if self.adapter and self.adapter.thing and unique_id in self.adapter.thing.properties:
                if self.DEBUG:
                    print("OK, unique_id is in properties")
                var_type = self.persistent_data['variables'][unique_id]['type']
                going_up = bool(self.persistent_data['variables'][unique_id]['going_up'])
                if self.DEBUG:
                    print(" -+ var_type: ", var_type)
                    print(" -+ trigger['increases']: ", trigger['increases'])

                # range
                # loop
                # bounce
                # stay_above
                # stay_below
                # start_at

                try:

                    # SET IT TO
                    if trigger['increases'] == 'set_it_to':
                        if self.DEBUG:
                            print("handling set_it_to")
                        self.adapter.thing.properties[unique_id].update(value_change)


                    # BOUNCE
                    elif var_type == 'bounce':
                        if self.DEBUG:
                            print("handling bounce variable.  going_up: ", going_up)
                        if going_up == True:
                            theoretical_bounce_value = float(initial_value) + float(value_change)
                            if self.DEBUG:
                                print("bounce: going up:  theoretical_bounce_value: ", theoretical_bounce_value)
                            if theoretical_bounce_value > float(item['limit2']):
                                self.adapter.thing.properties[unique_id].update(float(item['limit2']))
                                self.persistent_data['variables'][unique_id]['going_up'] = not going_up
                                #overshoot = float(trigger['limit2']) - theoretical_bounce_value
                            else:
                                self.adapter.thing.properties[unique_id].update(theoretical_bounce_value)
                        else:
                            theoretical_bounce_value = float(initial_value) - float(value_change)
                            if self.DEBUG:
                                print("bounce: going down:  theoretical_bounce_value: ", theoretical_bounce_value)
                            if theoretical_bounce_value < float(item['limit1']):
                                self.adapter.thing.properties[unique_id].update(float(item['limit1']))
                                self.persistent_data['variables'][unique_id]['going_up'] = not going_up
                            else:
                                self.adapter.thing.properties[unique_id].update(theoretical_bounce_value)


                    # INCREASE
                    elif trigger['increases'] == 'increase':
                        theoretical_additive_value = float(initial_value) + float(value_change)
                        if self.DEBUG:
                            print("update_variable: theoretical_additive_value: ", type(theoretical_additive_value), theoretical_additive_value)
                        if var_type == 'start_at' or var_type == 'stay_above' or theoretical_additive_value < float(item['limit2']):
                            if self.DEBUG:
                                print("setting theoretical_additive_value directly: ", type(theoretical_additive_value), theoretical_additive_value)
                            self.adapter.thing.properties[unique_id].update(theoretical_additive_value)
                        else:
                            overshoot = theoretical_additive_value - float(item['limit2'])
                            if self.DEBUG:
                                print("increase overshoot: ", type(overshoot), overshoot)
                            if var_type == 'range' or var_type == 'stay_below':
                                self.adapter.thing.properties[unique_id].update(float(item['limit2']))
                            elif var_type == 'loop':
                                if overshoot == 0:
                                    self.adapter.thing.properties[unique_id].update(float(item['limit2']))
                                elif overshoot < (float(item['limit2']) - float(item['limit1'])):
                                    self.adapter.thing.properties[unique_id].update(float(item['limit1']) + overshoot)
                                else:
                                    self.adapter.thing.properties[unique_id].update(float(item['limit1']))
                            else:
                                if self.DEBUG:
                                    print("var_type fell through while handling 'increase': ", var_type)


                    # DECREASE
                    elif trigger['increases'] == 'decrease':
                        theoretical_subtractive_value = float(initial_value) - float(value_change)
                        if self.DEBUG:
                            print("decrease: theoretical_subtractive_value: ", type(theoretical_subtractive_value), theoretical_subtractive_value)
                        if var_type == 'start_at' or var_type == 'stay_below' or theoretical_subtractive_value > float(item['limit1']):
                            self.adapter.thing.properties[unique_id].update(theoretical_subtractive_value)
                        else:
                            overshoot = float(item['limit1']) - theoretical_subtractive_value
                            if self.DEBUG:
                                print("decrease overshoot: ", type(overshoot), overshoot)
                            if var_type == 'range' or var_type == 'stay_above':
                                self.adapter.thing.properties[unique_id].update(float(item['limit1']))
                            elif var_type == 'loop':
                                if overshoot == 0:
                                    self.adapter.thing.properties[unique_id].update(float(item['limit1']))
                                elif overshoot < (float(item['limit2']) - float(item['limit1'])):
                                    self.adapter.thing.properties[unique_id].update(float(item['limit2']) - overshoot)
                                else:
                                    self.adapter.thing.properties[unique_id].update(float(item['limit2']))
                            else:
                                if self.DEBUG:
                                    print("var_type fell through while handling 'decrease': ", var_type)


                    else:
                        if self.DEBUG:
                            print("ERROR: update_variable: setting new value fell through")


                except Exception as ex:
                    if self.DEBUG:
                        print("caught error setting value of Variables property: ", ex)

                


        except Exception as ex:
            if self.DEBUG:
                print("caught error in update_variable: ", ex)

        






#
#  HANDLE REQUEST
#

    def handle_request(self, request):
        """
        Handle a new API request for this handler.

        request -- APIRequest object
        """

        try:

            if request.method != 'POST':
                return APIResponse(status=404)

            if request.path == '/init' or request.path == '/update_items' or request.path == '/regenerate_thing':

                try:

                    if request.path == '/init':
                        if self.DEBUG:
                            print("Getting the initialisation data")

                        try:
                            state = False
                            message = ''

                            if 'jwt' in request.body:
                                fresh_token = request.body['jwt']
                                if isinstance(fresh_token,str):
                                    if len(str(fresh_token)) > 10:
                                        self.persistent_data['token'] = str(fresh_token)
                                        state = True

                            # Check if a token is present
                            token = True
                            if self.persistent_data['token'] == None:
                                message = 'This addon requires an authorization token to work. Visit the settings page of this addon to learn more.'
                                token = False

                            return APIResponse(
                                status=200,
                                content_type='application/json',
                                content=json.dumps({
                                        'state': state,
                                        'message': message,
                                        'items': self.persistent_data['items'],
                                        'variables': self.persistent_data['variables'],
                                        'debug': self.DEBUG,
                                        'ready': self.ready,
                                        'greyscale':self.greyscale,
                                        'screensaver_scroll':self.screensaver_scroll,
                                    })
                            )

                        except Exception as ex:
                            if self.DEBUG:
                                print("Error getting init data: " + str(ex))
                            return APIResponse(
                                status=500,
                                content_type='application/json',
                                content=json.dumps({
                                        "state": False,
                                        "Message":" Internal error: no thing data",
                                        "debug": self.DEBUG,
                                        "ready": self.ready
                                    })
                            )


                    elif request.path == '/update_items':
                        try:
                            if 'items' in request.body:
                                self.persistent_data['items'] = request.body['items']

                                self.update_simple_things()
                                if self.got_good_things_list:
                                    # try to get the correct property type (integer/float)
                                    try:
                                        for i in range(len(self.persistent_data['items'])):

                                            item = self.persistent_data['items'][i]
                                            #print("_item: " + str(item))
                                            if 'thing2' in item and 'property2' in item:
                                                for thing in self.things:
                                                    thing_id = str(thing['id'].rsplit('/', 1)[-1])
                                                    if str(item['thing2']) == thing_id:
                                                        for thing_property_key in thing['properties']:

                                                            # TODO: this is a bit strange
                                                            if len(thing['properties'][thing_property_key]['links']) > 0:
                                                                property_id = thing['properties'][thing_property_key]['links'][0]['href'].rsplit('/', 1)[-1]
                                                            else:
                                                                property_id = thing['properties'][thing_property_key]['links'][0]['forms'].rsplit('/', 1)[-1]

                                                            if str(item['property2']) == property_id:
                                                                if self.DEBUG:
                                                                    print("Property: " + str(property_id) + ", was of variable type: " + str(thing['properties'][thing_property_key]['type']))
                                                                self.persistent_data['items'][i]['property2_type'] = str(thing['properties'][thing_property_key]['type'])


                                        if 'token' in self.persistent_data and len(str(self.persistent_data['token'])) > 10:
                                            self.connect_to_all_things()

                                    except Exception as ex:
                                        if self.DEBUG:
                                            print("Error finding if property should be int or float: " + str(ex))

                                else:
                                    return APIResponse(
                                        status=500,
                                        content_type='application/json',
                                        content=json.dumps({"state":False,"message":"Please wait a few seconds, Followers has not fully loaded yet"})
                                    )



                            if 'variables' in request.body:
                                self.persistent_data['variables'] = request.body['variables']

                            self.save_persistent_data()

                            return APIResponse(
                                status=200,
                                content_type='application/json',
                                content=json.dumps({'state' : True}),
                            )

                        except Exception as ex:
                            if self.DEBUG:
                                print("\ncaught ERROR saving updated items and/or variables: " + str(ex))
                            return APIResponse(
                                status=500,
                                content_type='application/json',
                                content=json.dumps({"state":"Error updating items: " + str(ex)}),
                            )


                    elif request.path == '/regenerate_thing':
                        if self.DEBUG:
                            print("/regenerate_thing called")
                        state = False
                        try:
                            if self.adapter and self.adapter.thing:
                                self.adapter.thing.regenerate_properties()
                                state = True
                            else:
                                if self.DEBUG:
                                    print("\nERROR, no self.adapter.thing?")
                                
                        except Exception as ex:
                            if self.DEBUG:
                                print("\ncaught ERROR requesting regeneration of candle-variables device properties: ", ex)
                        
                        return APIResponse(
                            status=200,
                            content_type='application/json',
                            content=json.dumps({'state': state}),
                        )
                    
                    else:
                        return APIResponse(status=404)


                except Exception as ex:
                    if self.DEBUG:
                        print("Error while handling request: " + str(ex))
                    return APIResponse(
                        status=500,
                        content_type='application/json',
                        content=json.dumps({"state":False,"Message":"Error in API handler"}),
                    )

            else:
                return APIResponse(status=404)

        except Exception as ex:
            if self.DEBUG:
                print("caught general error trying to handle UX extension API request: " + str(ex))
            return APIResponse(
                status=500,
                content_type='application/json',
                content=json.dumps({"state":False,"Message":"API Error"}),
            )


    def unload(self):
        self.running = False
        if self.DEBUG:
            print("Followers shutting down")




    def cancel_pairing(self):
        """Cancel the pairing process."""
        #print("END OF PAIRING -----------------------------")

        # Get all the things via the API.
        self.update_simple_things()




#
#  API
#

    def api_get(self, api_path,intent='default'):
        """Returns data from the WebThings Gateway API."""
        if self.DEBUG:
            print("GET PATH = " + str(api_path))
            #print("intent in api_get: " + str(intent))
        #print("GET TOKEN = " + str(self.persistent_data['token']))
        if self.persistent_data['token'] == None:
            print("API GET: PLEASE ENTER YOUR AUTHORIZATION CODE IN THE SETTINGS PAGE")
            return []

        try:
            r = requests.get(self.api_server + api_path, headers={
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ' + str(self.persistent_data['token']),
                }, verify=False, timeout=5)
            if self.DEBUG:
                print("API GET: " + str(r.status_code) + ", reason: " + str(r.reason))

            if r.status_code != 200:
                if self.DEBUG:
                    print("API returned a status code that was not 200. It was: " + str(r.status_code))
                return {"error": str(r.status_code)}

            else:
                to_return = r.text
                try:
                    if self.DEBUG:
                        print("api_get: received: " + str(r))
                    #for prop_name in r:
                    #    print(" -> " + str(prop_name))
                    if not '{' in r.text:
                        if self.DEBUG:
                            print("api_get: response was not json (gateway 1.1.0 does that). Turning into json...")

                        if 'things/' in api_path and '/properties/' in api_path:
                            if self.DEBUG:
                                print("properties was in api path: " + str(api_path))
                            likely_property_name = api_path.rsplit('/', 1)[-1]
                            to_return = {}
                            to_return[ likely_property_name ] = json.loads(r.text)
                            if self.DEBUG:
                                print("returning fixed: " + str(to_return))
                            return to_return

                except Exception as ex:
                    print("api_get_fix error: " + str(ex))

                if self.DEBUG:
                    print("returning without 1.1.0 fix")
                return json.loads(r.text)

        except Exception as ex:
            print("Error doing http request/loading returned json: " + str(ex))

            return {"error": 500}



    def api_put(self, api_path, json_dict, intent='default'):
        """Sends data to the WebThings Gateway API."""

        try:

            if self.DEBUG:
                print("PUT > api_path = " + str(api_path))
                print("PUT > json dict = " + str(json_dict))
                print("PUT > self.api_server = " + str(self.api_server))
                print("PUT > intent = " + str(intent))
                print("self.gateway_version: " + str(self.gateway_version))

            simplified = False
            property_was = None
            if self.gateway_version != "1.0.0":

                if 'things/' in api_path and '/properties/' in api_path:
                    if self.DEBUG:
                        print("PUT: properties was in api path: " + str(api_path))
                    for key in json_dict:
                        property_was = key
                        simpler_value = json_dict[key]
                        json_dict = simpler_value
                    #simpler_value = [elem[0] for elem in json_dict.values()]
                    if self.DEBUG:
                        print("simpler 1.1.0 value to put: " + str(simpler_value))
                    simplified = True
                    #likely_property_name = api_path.rsplit('/', 1)[-1]
                    #to_return = {}


        except Exception as ex:
            print("Error preparing PUT: " + str(ex))

        headers = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Bearer {}'.format(self.persistent_data['token']),
        }
        try:
            r = requests.put(
                self.api_server + api_path,
                json=json_dict,
                headers=headers,
                verify=False,
                timeout=5
            )
            if self.DEBUG:
                print("API PUT: " + str(r.status_code) + ", reason: " + str(r.reason))
                print("PUT returned: " + str(r.text))
                print("PUT returned type: " + str(type(r.text)))
                print("PUT returned len: " + str(len(r.text)))

            if r.status_code < 200 or r.status_code > 208:
                if self.DEBUG:
                    print("Error communicating: " + str(r.status_code))
                return {"error": str(r.status_code)}
            else:
                return_value = {}
                try:
                    if len(r.text) != 0:
                        if simplified:
                            if property_was != None:
                                if not '{' in r.text:
                                    return_value[property_was] = r.text
                                else:
                                    return_value[property_was] = json.loads(r.text) # json.loads('{"' + property_was + '":' + r.text + '}')
                        else:
                            return_value = json.loads(r.text)
                except Exception as ex:
                    if self.DEBUG:
                        print("Error reconstructing put response: " + str(ex))

                return_value['succes'] = True
                return return_value

        except Exception as ex:
            print("Error doing http request/loading returned json: " + str(ex))
            return {"error": 500}

#
#  SAVE TO PERSISTENCE
#

    def save_persistent_data(self):
        if self.DEBUG:
            print("Follower: Saving to persistence data store at path: " + str(self.persistence_file_path))

        try:
            if not os.path.isfile(self.persistence_file_path):
                open(self.persistence_file_path, 'a').close()
                if self.DEBUG:
                    print("Created an empty persistence file")
            #else:
            #    if self.DEBUG:
            #        print("Persistence file existed. Will try to save to it.")


            with open(self.persistence_file_path) as f:
                if self.DEBUG:
                    print("saving persistent data: " + str(self.persistent_data))
                json.dump( self.persistent_data, open( self.persistence_file_path, 'w+' ), indent=4 )
                return True

        except Exception as ex:
            print("Error: could not store data in persistent store: " + str(ex) )
            return False



def translate(value, leftMin, leftMax, rightMin, rightMax):
    try:

        #print("leftMin = " + str(leftMin))
        #print("leftMax = " + str(leftMax))
        #print("rightMin = " + str(rightMin))
        #print("rightMax = " + str(rightMax))
        # Figure out how 'wide' each range is
        leftSpan = float(leftMax) - float(leftMin)
        rightSpan = float(rightMax) - float(rightMin)

        #print(str(leftSpan))
        #print(str(rightSpan))

        # Convert the left range into a 0-1 range (float)
        valueScaled = float(float(value) - float(leftMin)) / float(leftSpan)

        #print("valueScaled = " + str(valueScaled))

        new_value = float(rightMin) + (valueScaled * rightSpan)

        # Convert the 0-1 range into a value in the right range.
        return new_value
    except Exception as ex:
        print("Error in translate: " + str(ex) )
        return 0





def get_int_or_float(v):
    number_as_float = float(v)
    number_as_int = int(number_as_float)
    if number_as_float == number_as_int:
        return number_as_int
    else:
        return float( int( number_as_float * 1000) / 1000)
