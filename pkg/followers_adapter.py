try:
    from gateway_addon import Adapter, Device, Property, Action, Event
    #print("succesfully loaded APIHandler and APIResponse from gateway_addon")
except:
    print("ERROR, could not load vital libraries to interact with the controller")


#
# ADAPTER
#

class FollowersAdapter(Adapter):
    """Adapter for Photo Frame"""

    def __init__(self, api_handler, verbose=False):
        """
        Initialize the object.

        verbose -- whether or not to enable verbose logging
        """
        self.api_handler = api_handler
        self.DEBUG = bool(api_handler.DEBUG)
        self.addon_name = str(self.api_handler.addon_name) #'followers'
        self.name = self.__class__.__name__
        if self.DEBUG:
            print("adapter: self.name: ", self.name)
        self.ready = False
        Adapter.__init__(self, self.addon_name, self.addon_name, verbose=verbose)
        #print("Adapter ID = " + self.get_id())




        try:
            # Create the thing
            self.followers_device = FollowersDevice(self) # ,"variables-thing","Variables" # are these last two parameters processed?
            self.handle_device_added(self.followers_device)
            if self.DEBUG:
                print("followers device added")
            #self.devices['candle-variables'].connected = True
            #self.devices['candle-variables'].connected_notify(True)
            self.thing = self.get_device("candle-variables")
            self.thing.connected_notify(True)
            self.thing.connected = True

        except Exception as ex:
            if self.DEBUG:
                print("caught error during followers adapter device init: " + str(ex))

        self.ready = True

    def remove_thing(self, device_id):
        if self.DEBUG:
            print("Removing followers thing: " + str(device_id))

        try:
            obj = self.get_device(device_id)
            self.handle_device_removed(obj)                     # Remove from device dictionary

        except Exception as ex:
            if self.DEBUG:
                print("caught error: could not remove thing from Followers adapter devices: " + str(ex))



#
# DEVICE
#

class FollowersDevice(Device):
    """Followers device type."""

    def __init__(self, adapter):
        """
        Initialize the object.
        adapter -- the Adapter managing this device
        """

        Device.__init__(self, adapter, 'followers')

        self._id = 'candle-variables'
        self.id = 'candle-variables'
        self.name = 'candle-variables'
        self.adapter = adapter
        self.DEBUG = self.adapter.DEBUG

        self._type = ["MultiLevelSensor"]

        
        self.title = 'Variables'
        self.description = 'Thing with properties that represent variables'

        self.properties = {}

        self.regenerate_properties()
        

            
            #self.add_event('Start screensaver',{})
            #self.add_event('Previous photo',{})
            #self.add_event('Next photo',{})

            #self.add_action("Start screensaver", {})

            #self.add_action("Previous photo", {})

            #self.add_action("Next photo", {})


        if self.DEBUG:
            print("debug: Variables thing has been created")



    def regenerate_properties(self):
        added_level_property = False
        for unique_id in self.adapter.api_handler.persistent_data['variables'].keys():
            try:
            
                if self.DEBUG:
                    print("device: creating variables property from: ", unique_id)
                
                description = {
                        'title': str(self.adapter.api_handler.persistent_data['variables'][unique_id]['name'])[:32],
                        'type': 'number',
                    }
                
                if (self.adapter.api_handler.persistent_data['variables'][unique_id]['type'] == 'range' or \
                  self.adapter.api_handler.persistent_data['variables'][unique_id]['type'] == 'loop' or \
                  self.adapter.api_handler.persistent_data['variables'][unique_id]['type'] == 'bounce') and \
                  'limit1' in self.adapter.api_handler.persistent_data['variables'][unique_id] and len(str(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit1'])) and \
                  'limit2' in self.adapter.api_handler.persistent_data['variables'][unique_id] and len(str(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit2'])):
                  
                    description['minimum'] = float(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit1'])
                    description['maximum'] = float(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit2'])
                
                    if added_level_property == False:
                        added_level_property = True
                        description['@type'] = 'LevelProperty'
                    

                if not 'value' in self.adapter.api_handler.persistent_data['variables'][unique_id]:
                    if 'limit1' in self.adapter.api_handler.persistent_data['variables'][unique_id] and len(str(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit1'])):
                        self.adapter.api_handler.persistent_data['variables'][unique_id]['value'] = float(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit1'])
                    elif 'limit2' in self.adapter.api_handler.persistent_data['variables'][unique_id] and len(str(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit2'])):
                        self.adapter.api_handler.persistent_data['variables'][unique_id]['value'] = float(self.adapter.api_handler.persistent_data['variables'][unique_id]['limit2'])
                    else:
                        if self.DEBUG:
                            print("device: WARNING, no value. Setting it to zero..")
                        self.adapter.api_handler.persistent_data['variables'][unique_id]['value'] = 0
                
                self.properties[unique_id] = FollowersProperty(
                                    self,
                                    unique_id,
                                    description,
                                    self.adapter.api_handler.persistent_data['variables'][unique_id]['value'])
                
                if self.DEBUG:
                    print("device: calling self.adapter.handle_device_added")
                self.adapter.handle_device_added(self)
                
            except Exception as ex:
                if self.DEBUG:
                    print("device: caught error in regenerate_properties " + str(ex))
        


    """
    def perform_action(self,action):
        if self.DEBUG:
            print("in perform_action")
            print("perform_action: self.events: ", self.events)
        action_to_perform = action.as_dict()
        if self.DEBUG:
            print("perform_action: action as dict: ", action_to_perform)
        if 'name' in action_to_perform:
            if self.DEBUG:
                print("action to perform has name: ", action_to_perform['name'])
    """


#
# PROPERTY
#

class FollowersProperty(Property):

    def __init__(self, device, name, description, value):
        Property.__init__(self, device, name, description)
        self.device = device
        self.DEBUG = self.device.DEBUG

        self.id = name
        self.name = name
        self.title = description['title']
        self.description = description # dictionary
        self.value = value
        self.set_cached_value(value)
        self.device.notify_property_changed(self)


    def set_value(self, value, meta=None):
        if self.DEBUG and meta != None:
            print("property: set_value: received meta data.  self.title, meta: ", self.title, meta)
        #print("property: set_value called for " + str(self.title))
        #print("property: set value to: " + str(value))
        try:

            self.update(value)


            #if self.title == 'Show next photo':
                #pass
                #self.device.adapter.api_handler.set_screensaver_state(bool(value))
                #self.device.adapter.set_radio_state(True) # If the user changes the station, we also play it.
                #self.update(bool(value))

            #if self.title == 'video audio output':
            #    self.device.adapter.set_video_audio_output(str(value))

            #if self.title == 'state':
            #    self.device.adapter.set_state(bool(value))

            #if self.title == 'power':
            #    self.device.adapter.set_followers_state(bool(value))
                #self.update(value)

            #if self.title == 'volume':
            #    self.device.adapter.set_followers_volume(int(value))
                #self.update(value)

        except Exception as ex:
            if self.DEBUG:
                print("caught set_value error: " + str(ex))
        return value


    def update(self, value, meta=None):
        if self.DEBUG and meta != None:
            print("property: update: unexpectedly received meta data.  self.title, meta: ", self.title, meta)
        
        if self.DEBUG:
            print("property -> update.  existing value: ", self.value)
            print("property -> update.  typeof value, value: ", type(value), value)
           
        self.device.adapter.api_handler.persistent_data['variables'][self.id]['value'] = value
        
        if value != self.value:
            self.device.adapter.api_handler.should_save = True
            self.value = value
            self.set_cached_value(value)
            self.device.notify_property_changed(self)
        return self.value
        
        
        