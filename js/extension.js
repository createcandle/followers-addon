(function() {
  class Followers extends window.Extension {
	constructor() {
	  	super('followers');
		//console.log("Adding followers addon to menu");
		this.addMenuEntry('Followers');
		this.addMenuEntry('Variables');
		/*
		console.log("App: ", typeof App);
		console.log("this.APP: ", typeof this.APPf);
		console.log("window: ", window);
		console.log("this: ", this);
		console.log("this.App: ", this.App);
		console.log("this.app: ", this.app);

		API.getThings().then((things) => {
			console.log('API: things: ', things);
		});

		API.getThing('internet-radio').then((thing) => {
			console.log('API: thing: ', thing);
			console.log("typeof thing.subscribe: ", typeof thing.subscribe);
			console.log("typeof this.subscribe: ", typeof this.subscribe);
			console.log("typeof thing.thingModel ", typeof thing.thingModel);
			console.log("typeof this.thingModel ", typeof this.thingModel);
			console.log("typeof thing.APP: ", typeof thing.APP);
			console.log("typeof this.APP: ", typeof this.APP);
		});
		*/

		this.content = '';
		this.debug = false;

		this.greyscale = false;
		this.screensaver_scroll = true;

		this.showing_not_ready_yet_warning = false;
		//this.showing_screensaver = false;

		this.item_elements = ['limit1', 'limit2', 'thing1', 'property1', 'limit3', 'limit4', 'thing2', 'property2'];
		this.variables_elements = ['name','type','limit1','limit2'];
		this.variables_triggers_elements = ['thing1', 'property1', 'boolean_change', 'number_change', 'string_change', 'change_value', 'change_enum_value', 'increases','by','amount', 'time_delta', 'time_delta_multiplier'];
		
		this.all_things;
		this.items_list = [];

		this.item_number = 0;
		this.variables_number = 0;

		this.variables = {};
		this.at_variables = false;
		this.variables_menu_item_el = null;

		this.thing_property_lookup = {};

		//console.log("followers: window.location.hash: ", window.location.hash);

		if(window.location.hash == '#variables'){
			this.at_variables = true;
			this.view.classList.add('extensions-followers-view-show-variables');
		}


		this.followers_menu_item_el = document.getElementById('extension-dashboard-menu-item');
		if(this.followers_menu_item_el){
			this.followers_menu_item_el.addEventListener('click', () => {
				
				//if(document.body.classList.contains('screensaver')){
				//	this.at_variables = true;
				//	this.view.classList.add('extensions-followers-view-show-variables');
				//}
				
				this.view.classList.remove('extensions-followers-view-show-variables');
				if(this.at_variables){
					this.at_variables = false;
					this.regenerate_items();
				}
				
				this.regenerate_variables(); // generate it once, just to ensure that the screensaver will work
				
				
			});
		}
		/*
		this.variables_menu_item_el = document.getElementById('extension-variables-menu-item');
		if(this.variables_menu_item_el){
			this.variables_menu_item_el.addEventListener('click', () => {
				this.view.classList.add('extensions-followers-view-show-variables');
				if(this.at_variables == false){
					this.at_variables = true;
				}
				this.regenerate_variables();
			});
		}
		*/
		

		
		const main_menu_ul_el = document.querySelector('#main-menu > ul');
		if(main_menu_ul_el){
			const menu_link_els = main_menu_ul_el.querySelectorAll('a');
			if(menu_link_els){
				for( let di = 0; di < menu_link_els.length; di++){

					//console.warn("MENU ITEM: ", menu_link_els[di].textContent);

					if(menu_link_els[di].textContent == 'Variables'){
						this.variables_menu_item_el = menu_link_els[di];
						this.variables_menu_item_el.setAttribute('id','extension-variables-menu-item');
						this.variables_menu_item_el.setAttribute('href','/extensions/followers#variables');

						this.variables_menu_item_el.addEventListener('click', (event) => {
							//event.preventDefault();
							this.at_variables = true;
							this.view.classList.add('extensions-followers-view-show-variables');
							this.regenerate_variables();
						});
						break
					}
				}
			}
		}
		
		fetch(`/extensions/${this.id}/views/content.html`)
		.then((res) => res.text())
		.then((text) => {
		 	this.content = text;
			if( document.location.pathname == "/extensions/followers" ){
				//console.log('followers: calling this.show from constructor init because at /followers url');
				this.show();
			}
		})
		.catch((e) => console.error('Failed to fetch content:', e));


		if (typeof this.subscribeToThingProperties == 'function'){
			console.warn("\n\n\nthis.subscribeToThingProperties is available");
			API.getThings().then((things) => {
				//console.log('API: things: ', things);
				for(const index in things){
					//console.log("things[index]['href']: ", things[index]['href']);
					if(things[index]['href'] == '/things/candle-variables'){
						console.log("/things/candle-variables exists. Subscribing.")
						// Candle-variables thing exists, so let's subscribe to updates about its properties
						this.subscribeToThingProperties('candle-variables', (message) => {
							//if(this.debug){
							console.warn("followers debug: variables: subscribeToThingProperties: received message: ", message);
							//}
							for (let [unique_id, details] of Object.entries(this.variables)) {
								console.log("looking over variables items:  unique_id, detail: ", unique_id, details);
								if(typeof message[unique_id] != 'undefined'){
									//if(this.debug){
									console.warn("followers debug: found the variable that was updated.  unique_id and new value: ", unique_id, message[unique_id]);
									//}
									this.variables[unique_id]['value'] = message[unique_id];
									this.update_variables_screensaver_item(unique_id);
									const variable_item_value_el = this.view.querySelector('#extension-followers-variables-list > .extension-followers-item[data-extension-followers-variables-item-unique-id="' + unique_id + '"] .extension-followers-value');
									if(variable_item_value_el){
										console.log("OK, found variable_item_value_el")
										variable_item_value_el.value = message[unique_id];
									}
									else{
										console.warn("cound not find variable_item_value_el");
									}
								}
							}
							
						});
						break
					}
						
				}
			});
			
		}
		else{
			console.warn("this.subscribeToThingProperties is not available");
		}
	}

	/*
	showMenuButton() {
    	App.showMenuButton();
		console.log("showMenuButton: App: ", App);
    	const backButton = document.getElementById('extension-back-button');
    	backButton.classList.add('hidden');
  	}
	*/

	random_letter() {
		const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
		return letters.charAt(Math.floor(Math.random() * letters.length));
	}

	show() {
		if(this.debug){
			console.log("followers debug: show called");
		}
		
		if(this.content == ''){
			if (this.debug) {
				console.warn('followers debug: show called, but content was still empty. Aborting.');
			}
			return;
		}
		const view = document.getElementById('extension-followers-view');
		//console.log("followers html: ", this.content);
		this.view.innerHTML = this.content;


		

		setTimeout(() => {

			//const original = document.getElementById('extension-followers-original-item');
			//const list = document.getElementById('extension-followers-list');
			const leader_dropdown = this.view.querySelector('#extension-followers-original-item .extension-followers-thing1');
			const follower_dropdown = this.view.querySelector('#extension-followers-original-item .extension-followers-thing2');

			if(leader_dropdown == null){
				if (this.debug) {
					console.error("followers debug: something is very wrong, leader_dropdown does not exist");
				}
			}
			else{
				//console.log("leader dropdown existed");
			}



		  	// Click event for followers ADD button
			const followers_add_button_el = this.view.querySelector('#extension-followers-add-button');
			if(followers_add_button_el){
				followers_add_button_el.addEventListener('click', () => {
					this.items_list.push({'enabled': false});
					this.regenerate_items();
					view.scrollTop = view.scrollHeight;
			  	});
			}


			const variables_play_overlay_el = this.view.querySelector('#extension-followers-variables-play-overlay');
			if (variables_play_overlay_el) {
				variables_play_overlay_el.addEventListener('click', () => {
					this.stop_variables_screensaver();
				});
			}


			const variables_play_button_el = this.view.querySelector('#extension-followers-variables-play-button-container');
			if (variables_play_button_el) {
				variables_play_button_el.addEventListener('click', () => {
					this.start_variables_screensaver();
				});
			}
			// Click event for variables ADD button
			const variables_add_button_el = this.view.querySelector('#extension-followers-variables-add-button');
			if(variables_add_button_el){
		  		variables_add_button_el.addEventListener('click', () => {
					this.add_variable();
			  	});
			}

			this.view.querySelector('#extension-followers-title').addEventListener('click', () => {
				this.view.classList.add('extensions-followers-view-show-variables');
				this.at_variables = true;
				this.regenerate_variables();
			});

			this.view.querySelector('#extension-followers-variables-title').addEventListener('click', () => {
				this.view.classList.remove('extensions-followers-view-show-variables');
				this.at_variables = false;
				this.regenerate_items();
			});

			// Pre populating the original item that will be clones to create new ones
			API.getThings().then((things) => {

				function compare(a, b) {

				  const thingA = a.title.toUpperCase();
				  const thingB = b.title.toUpperCase();

				  if (thingA > thingB) {
					return 1;
				  } else if (thingA < thingB) {
					return -1;
				  }
				  return 0;
				}

				things.sort(compare);
				//console.log("sorted things: ", things);

				this.all_things = things;
				//console.log("followers: all things: ", things);
				//console.log(things);


				// pre-populate the hidden 'new' item with all the thing names
				var thing_ids = [];
				var thing_titles = [];

				for (let key in things){

					var thing_title = 'unknown';
					if( things[key].hasOwnProperty('title') ){
						thing_title = things[key]['title'];
					}
					else if( things[key].hasOwnProperty('label') ){
						thing_title = things[key]['label'];
					}

					//console.log(thing_title);
					try{
						if (thing_title.startsWith('highlights-') ){
							// Skip highlight items
							continue;
						}

					}
					catch(err){
						if (this.debug) {
							console.error("followers debug: caught error in creating list of things for followers: ", err);
						}
					}

					var thing_id = things[key]['href'].substr(things[key]['href'].lastIndexOf('/') + 1);
					try{
						if (thing_id.startsWith('highlights-') ){
							// Skip items that are already highlight clones themselves.
							//console.log(thing_id + " starts with highlight-, so skipping.");
							continue;
						}

					}
					catch(err){
						if (this.debug) {
							console.log("followers debug: caught error in creating list of things for item: ", err);
						}
					}
					thing_ids.push( things[key]['href'].substr(things[key]['href'].lastIndexOf('/') + 1) );


					// for each thing, get its property list. Only add it to the selectable list if it has properties that are numbers.
					// In case of the second thing, also make sure there is at least one non-read-only property.
					const property_lists = this.get_property_lists(things[key]['properties']);

					if(property_lists['property1_list'].length > 0){
						//console.log("adding thing to source list because a property has a number");
						leader_dropdown.options[leader_dropdown.options.length] = new Option(thing_title, thing_id);
						if(property_lists['property2_list'].length > 0){
							//console.log("adding thing to target list because a property can be written");
							follower_dropdown.options[follower_dropdown.options.length] = new Option(thing_title, thing_id);
						}
					}
				}

				const jwt = localStorage.getItem('jwt');

		  		// Get list of items
				window.API.postJson(
				  `/extensions/${this.id}/api/init`,
					{'jwt':jwt}

				).then((body) => {

					if(typeof body.debug == 'boolean'){
						this.debug = body.debug;
						if(body.debug){
							console.log("followers debug: init response: ", body);
							document.getElementById('extension-followers-debug-warning').style.display = 'block';
						}
					}

					if (typeof body.items != 'undefined') {
						this.items_list = body.items;
						if (!this.at_variables) {
							this.regenerate_items();
						}
					}

					if (typeof body.variables != 'undefined') {
						this.variables = body.variables;
						//if (this.at_variables || document.body.classList.contains('screensaver')) {
						//	this.regenerate_variables();
						//}
						this.regenerate_variables();
					}

					if (typeof body.greyscale == 'boolean') {
						this.greyscale = body.greyscale;
						if (this.greyscale){
							this.view.classList.add('extension-followers-greyscale');
						}
						else{
							this.view.classList.remove('extension-followers-greyscale');
						}
					}

					if (typeof body.screensaver_scroll == 'boolean') {
						this.screensaver_scroll = body.screensaver_scroll;
						if (!this.screensaver_scroll) {
							this.view.classList.remove('extension-followers-screensaver-scroll');
						}
					}


					if (typeof body.ready == 'boolean' && typeof body.state == 'boolean'){
						if (body.ready == false && this.showing_not_ready_yet_warning == false){
							this.showing_not_ready_yet_warning = true;
							this.view.querySelector('#extension-followers-variables-not-ready-warning').style.display = 'block';
							this.view.querySelector('#extension-followers-not-ready-warning').style.display = 'block';
						}
						else if (body.ready == true && this.showing_not_ready_yet_warning == true) {
							this.showing_not_ready_yet_warning = false;
							this.view.querySelector('#extension-followers-variables-not-ready-warning').style.display = 'none';
							this.view.querySelector('#extension-followers-not-ready-warning').style.display = 'none';
						}
					}
					/*
					if(typeof body.token == 'string'){
						if(!body.token){
							this.view.querySelector('#extension-followers-missing-key-warning').style.display = 'block';
						}
					}
					*/

				}).catch((err) => {
					// this.debug may not be set, so always show this error
	   	  			console.error("followers: caught error calling init via API handler: ", err);
				});

			});



			//
			//  SET PROPERTIES FOR SELECTED THING
			//  Change listener. Called if the user changes anything in the existing items in the list. Mainly used to update properties if a new thing is selected.
			//

			const followers_list_el = document.getElementById('extension-followers-list');
			followers_list_el.addEventListener('change', (event) => {
				//console.log("followers: eventlistener: change detected: ", event);

				try {

					// Loops over all the things, and when a thing matches the changed element, its properties list is updated.
					for (var thing in this.all_things) {
						//console.log( this.all_things[thing] );

						if (this.all_things[thing]['id'].endsWith(event['target'].value)) {
							const property_dropdown = event['target'].nextSibling;
							const property_lists = this.get_property_lists(this.all_things[thing]['properties']);
							try {
								if (property_dropdown !== undefined) {
									if ('options' in property_dropdown) {
										var select_length = property_dropdown.options.length;
										for (var i = select_length - 1; i >= 0; i--) {
											property_dropdown.options[i] = null;
										}
									}
								}
							}
							catch (err) {
								console.error("caught error clearing property dropdown select options: ", err);
							}


							// If thing1 dropdown was changed, update its property titles
							if (event['target'].classList.contains("extension-followers-thing1")) {
								for (var title in property_lists['property1_list']) {
									property_dropdown.options[property_dropdown.options.length] = new Option(property_lists['property1_list'][title], property_lists['property1_system_list'][title]);
								}
							}
							// If thing2 dropdown was changed, update its property titles
							else if (event['target'].classList.contains("extension-followers-thing2")) {
								for (var title in property_lists['property2_list']) {
									property_dropdown.options[property_dropdown.options.length] = new Option(property_lists['property2_list'][title], property_lists['property2_system_list'][title]);
								}
							}
						}
					}

				}
				catch (err) {
					if(this.debug){
						console.error("followers debug: caught error handling change in follower: ", err);
					}
				}



				var updated_values = [];
				const item_list = document.querySelectorAll('#extension-followers-list .extension-followers-item');

				// Loop over all the elements
				item_list.forEach(item => {
					var new_values = {};
					var incomplete = false;

					// For each item in the followers list, loop over all values in the item to check if they are filled.
					for (let value_name in this.item_elements) {
						const new_value = item.querySelector('.extension-followers-' + this.item_elements[value_name]).value;
						//console.log("new_value = " + new_value);
						//console.log("new_value.length = " + new_value.length);
						if (new_value.length > 0) {
							new_values[this.item_elements[value_name]] = item.querySelector('.extension-followers-' + this.item_elements[value_name]).value;
						}
						else {
							incomplete = true;
						}
					}
					//console.log( "Is item checked?" + item.querySelector('.extension-followers-enabled').checked );

					// Check if the minimum and maximum values are not the same, as that could lead to strange errors
					const delta1 = Math.abs(new_values['limit1'] - new_values['limit2']);
					const delta2 = Math.abs(new_values['limit3'] - new_values['limit4']);
					//console.log("delta1 = " + delta1);
					//console.log("delta2 = " + delta2);

					// Set the item to enabled as soon as all values are filled in properly. This is done only once.
					if (incomplete == false && delta1 > 0 && delta2 > 0 && item.classList.contains('new') && item.querySelector('.extension-followers-enabled').checked == false) {
						item.classList.remove('new');
						item.querySelector('.extension-followers-enabled').checked = true;
					}
					// Disable an item if it no longer has all required values, or if they are set incorrectly
					if ((incomplete == true || delta1 == 0 || delta2 == 0) && item.querySelector('.extension-followers-enabled').checked == true) {
						item.querySelector('.extension-followers-enabled').checked = false;
					}

					// TODO: what happens with negative values? or a mix of negative and positive values?

					// Check if this item is enabled
					new_values['enabled'] = item.querySelector('.extension-followers-enabled').checked;

					//new_values['speed'] = parseInt(item.querySelector('.extension-followers-speed').value);

					updated_values.push(new_values);

				});

				//console.log("updated_values:");
				//console.log(updated_values);


				// Store the updated list
				this.items_list = updated_values;

				// Send new values to backend
				//console.log("sending new item values to backend: ", updated_values);
				window.API.postJson(
					`/extensions/${this.id}/api/update_items`,
					{ 'items': updated_values }
				).then((body) => {
					//thing_list.innerText = body['state'];
					//console.log(body);
					if (body['state'] != true) {
						if (this.debug) {
							console.error('followers debug: calling updated_values returned a state that was false');
						}
					}

				}).catch((err) => {
					if (this.debug) {
						console.error("followers debug: caught error in save items handler: ", err);
					}
				});

			});
			











			
			//
			//  SET PROPERTIES FOR SELECTED VARIABLES
			//  Change listener. Called if the user changes anything in the existing items in the list. Mainly used to update properties if a new thing is selected.
			//

			const variables_list_el = this.view.querySelector('#extension-followers-variables-list');
			if (variables_list_el) {
				variables_list_el.addEventListener('click', () => {
					if (document.body.classList.contains('screensaver')) {
						this.stop_variables_screensaver();
						//variables_list_el.closest('#extension-followers-variables-content').classList.remove('extension-followers-variables-screensaver');
					}
				});

				variables_list_el.addEventListener('change', (event) => {
					if (this.debug) {
						console.log("followers debug: variables_list_el: eventListener: change detected: ", event);
					}
					this.handle_variable_item_change(event);
				});

			}
		
		}, 100);

	}


	hide() {
		/*
		try{
			if(document.getElementById('extension-hotspot-menu-item').classList.contains('selected') == false){
				this.view.innerHTML = "";
			}
		}
		catch(err){
			console.error("followers: caught error clearing HTML in hide: ", err);
		}
		*/
	}






	handle_variable_item_change(event=null,item=null){
		try {

			if (event){
				// Loops over all the things, and when a thing matches the changed element, its properties list is updated.
				for (var thing in this.all_things) {
					//console.log( this.all_things[thing] );

					try {
						//console.log(this.all_things[thing]['id'], " =?= ", event['target'].value);

						if (this.all_things[thing]['id'].endsWith('/' + event['target'].value)) {
							if (this.debug) {
								console.log("followers debug: variables: found the thing that changed: ", event['target'].value)
							}
							const property_dropdown_el = event['target'].nextSibling;
							if (this.debug) {
								console.log("followers debug: variables: sibling property_dropdown_el: ", property_dropdown_el);
							}

							if (property_dropdown_el) {
								property_dropdown_el.innerHTML = '';

								const property_lists = this.get_property_lists(this.all_things[thing]['properties'], false); // false = do not skip boolean properties
								if (this.debug) {
									console.log("followers debug: variables: property_lists: ", property_lists);
								}

								if (event.target.classList.contains("extension-followers-thing1")) { // always the case for variables, since triggers only need one property
									for (var title in property_lists['property1_list']) {
										property_dropdown_el.options[property_dropdown_el.options.length] = new Option(property_lists['property1_list'][title], property_lists['property1_system_list'][title]);
									}
								}

							}

						}
					}
					catch (err) {
						if (this.debug) {
							console.error("followers debug: caught error clearing property dropdown select options: ", err);
						}
					}
				}

				if(item == null){
					item = event.target.closest('.extension-followers-item');
				}


			}
			

		}
		catch (err) {
			if (this.debug) {
				console.error("followers debug: caught error handling change in follower: ", err);
			}
		}


		

		if (!item) {
			if (this.debug) {
				console.error("followers debug: handle_variable_item_change: no item");
			}
			return
		}
		let unique_id = item.getAttribute('data-extension-followers-variables-item-unique-id');
		if (typeof unique_id != 'string') {
			return
		}

		if (typeof this.variables[unique_id] == 'undefined') {
			console.error("followers:variables: somehow this unique ID no longer exists: ", unique_id); // perhaps deleted in another window?
			item.remove();
			return
		}
		//var updated_values = [];
		//const item_list = document.querySelectorAll('#extension-followers-variables-list .extension-followers-item');

		// Loop over all the Variables items
		//item_list.forEach(item => {

		if (typeof this.variables[unique_id]['triggers'] == 'undefined') {
			this.variables[unique_id]['triggers'] = {};
		}


		var incomplete = false;

		// For each item in the variables list, loop over all values in the item to check if they are filled.
		for (let value_index in this.variables_elements) {
			if (this.debug) {
				console.log("followers debug: variables: looking for input/select: ", this.variables_elements[value_index]);
			}
			const el_with_value = item.querySelector('.extension-followers-' + this.variables_elements[value_index]);
			if (el_with_value) {
				let new_value = el_with_value.value;

				if (el_with_value.tagName == 'input' && el_with_value.getAttribute('type') === 'number') {
					new_value = this.ensure_number(new_value);
				}

				if (this.debug) {
					console.log("followers debug: variables: new_value = ", new_value);
				}
				//console.log("new_value.length = " + new_value.length);

				if (('' + new_value).length > 0) {
					el_with_value.classList.remove('extension-followers-needs-a-value');
					this.variables[unique_id][this.variables_elements[value_index]] = new_value; //item.querySelector('.extension-followers-' + this.variables_elements[value_index]).value;
				}
				else {
					incomplete = true;
					el_with_value.classList.add('extension-followers-needs-a-value');
					//if (this.variables_elements[value_index] == 'name'){}
				}
			}
			else {
				if (this.debug) {
					console.error("followers debug: variables: could not find:  extension-followers-" + this.variables_elements[value_index]);
				}
			}

		}
		//console.log( "Is item checked?" + item.querySelectorAll('.extension-followers-variables-enabled')[0].checked );

		if (this.variables[unique_id]['limit1'] == this.variables[unique_id]['limit2']) {
			this.variables[unique_id]['limit2'] = parseInt(this.variables[unique_id]['limit1']) + 1;
		}

		const triggers_list_el = item.querySelector('.extension-followers-variables-item-triggers-list');
		if (triggers_list_el) {
			if (this.debug) {
				console.log("followers debug: variables: triggers_list_el: ", triggers_list_el);
			}
			const trigger_els = triggers_list_el.children;
			if (this.debug) {
				console.log("followers debug: variables: trigger_els: ", trigger_els);
			}
			for (var te = 0; te < trigger_els.length; te++) {
				let trigger_id = trigger_els[te].getAttribute('data-extension-followers-variables-trigger-id');
				if (typeof trigger_id != 'string') {
					if (this.debug) {
						console.error("followers debug: variables: trigger container without an ID?");
					}
					trigger_els[te].remove();
					continue
				}
				if (typeof this.variables[unique_id]['triggers'][trigger_id] == 'undefined') {
					if (this.debug) {
						console.error("followers debug: variables: trigger_id was missing: ", trigger_id);
					}
					continue
				}




				let trigger_values = {};
				for (let value_index in this.variables_triggers_elements) {
					if (this.debug) {
						//console.log("followers debug: variables: looking for value from trigger element: ", '.extension-followers-' + this.variables_triggers_elements[value_index]);
					}
					const trigger_el_with_value = trigger_els[te].querySelector('.extension-followers-' + this.variables_triggers_elements[value_index]);
					if (trigger_el_with_value) {
						this.variables[unique_id]['triggers'][trigger_id][this.variables_triggers_elements[value_index]] = trigger_el_with_value.value;
					}
					else {
						if (this.debug) {
							console.log("followers debug: variables: could not find trigger value el: ", this.variables_triggers_elements[value_index]);
						}
					}
				}

				if (typeof this.variables[unique_id]['triggers'][trigger_id]['property1_type'] == 'undefined') {
					this.variables[unique_id]['triggers'][trigger_id]['property1_type'] = null;
				}
				//trigger_values['type'] = null; // if it remains null, then it must be an action
				if (typeof this.variables[unique_id]['triggers'][trigger_id]['thing1'] == 'string' && typeof this.variables[unique_id]['triggers'][trigger_id]['property1'] == 'string') {
					const property_description = this.get_property_description(this.variables[unique_id]['triggers'][trigger_id]['thing1'], this.variables[unique_id]['triggers'][trigger_id]['property1']);
					if (this.debug) {
						console.log("followers debug: variables: property_description from get_property_description: ", property_description);
					}
					if (property_description && typeof property_description['type'] == 'string') {
						this.variables[unique_id]['triggers'][trigger_id]['property1_type'] = property_description['type'];

						if (this.variables[unique_id]['triggers'][trigger_id]['property1_type'] == 'string' && typeof property_description['enum'] != 'undefined' && Array.isArray(property_description['enum']) && property_description['enum'].length > 1) {
							const enum_change_el = trigger_els[te].querySelector('.extension-followers-change_enum_value');
							if (enum_change_el) {
								enum_change_el.innerHTML = '';
								this.variables[unique_id]['triggers'][trigger_id]['property1_type'] = 'enum';
								for (let ei = 0; ei < property_description['enum'].length; ei++) {
									enum_change_el.options[enum_change_el.options.length] = new Option(property_description['enum'][ei], property_description['enum'][ei]);
								}
							}
						}
					}
				}
				if (typeof this.variables[unique_id]['triggers'][trigger_id]['property1_type'] == 'string') {
					trigger_els[te].setAttribute('data-extension-followers-variables-trigger-property1-type', this.variables[unique_id]['triggers'][trigger_id]['property1_type']);
				}
				else {
					trigger_els[te].setAttribute('data-extension-followers-variables-trigger-property1-type', 'action');
				}

				// property or time trigger
				if (typeof this.variables[unique_id]['triggers'][trigger_id]['type'] == 'string') {
					trigger_els[te].setAttribute('data-extension-followers-variables-trigger-type', this.variables[unique_id]['triggers'][trigger_id]['type']);
				}
				else{
					trigger_els[te].setAttribute('data-extension-followers-variables-trigger-type', 'unknown');
				}



				if (this.debug) {
					console.log("followers debug: variables: trigger item's values: ", this.variables[unique_id]['triggers'][trigger_id]);
				}
			}


			// Check if this item is enabled
			const item_enabled_el = item.querySelector('.extension-followers-enabled');
			this.variables[unique_id]['enabled'] = item_enabled_el.checked;

			if (typeof this.variables[unique_id]['type'] == 'string') {
				item.setAttribute('data-extension-followers-variables-item-type', this.variables[unique_id]['type']); // range, bounce, etc
			}



			if (this.debug) {
				console.log("followers debug: variables: updated variables: ", unique_id, this.variables[unique_id]);
			}
			//updated_values.push(new_values);

		};

		//console.log("updated_values:");
		//console.log(updated_values);


		// Store the updated list
		//this.variables = updated_values;

		this.save_variables();
	}


	save_variables(){
		// Send variables to backend
		if (this.debug) {
			console.log("\n\nfollowers debug: variables: sending this.variables to backend: ", this.variables, "\n\n");
		}
		window.API.postJson(
			`/extensions/${this.id}/api/update_items`,
			{ 'variables': this.variables }
		).then((body) => {
			//thing_list.innerText = body['state'];
			//console.log(body);
			if (body['state'] != true) {
				if (this.debug) {
					console.error('followers debug: variables: regenerate_variables: calling updated_values returned a state that was false');
				}
			}
		}).catch((err) => {
			if (this.debug) {
				console.error("followers debug: variables: regenerate_variables: caught error in save items handler: ", err);
			}
		});
	}



	ensure_number(new_value=null){
		if (this.debug) {
			console.log("followers debug: variables: turn_into_number:  provided value: ", typeof new_value, new_value);
		}
		var int_pattern = /^\d+$/;
		var float_pattern = /^\d+\.?\d*$/;
		if (new_value == null){
			console.error('ensure_number: provided value was null');
			new_value = 1;
		}
		else if (int_pattern.test(new_value.toString())) {
			new_value = parseInt(new_value.toString());
		}
		else if (float_pattern.test(new_value.toString())) {
			new_value = parseFloat(new_value.toString());
			new_value = parseFloat(new_value.toFixed(3)); // limit to three decimals, and then remove trailing zeros
		}
		else if (!isNaN(new_value) && (new_value.toString().indexOf('.') != -1 || new_value.toString().indexOf(',') != -1)) {
			new_value = parseFloat(new_value.toString());
			new_value = parseFloat(new_value.toFixed(3));
		}
		else {
			if (this.debug) {
				console.warn("followers debug: variables: parsing number input into an actual int or float fell through!");
			}
			new_value = 1;
		}
		return new_value
	}











	//
	//  REGENERATE FOLLOWERS
	//

	regenerate_items(){
		if (this.debug) {
			console.log("followers debug: in regenerate_items.  this.items_list: ", this.items_list);
		}
		//console.log("this.all_things = ");
		//console.log(this.all_things);


		//const pre = document.getElementById('extension-followers-response-data');
		//const leader_property_dropdown = document.querySelectorAll(' #extension-followers-view #extension-followers-original-item .extension-followers-property2')[0];
		//const follower_property_dropdown = document.querySelectorAll(' #extension-followers-view #extension-followers-original-item .extension-followers-property2')[0];

		try {
			let items = this.items_list

			const original = document.getElementById('extension-followers-original-item');
			const list = document.getElementById('extension-followers-list');
			if(items.length > 0){
				//console.log("at least one item");
				list.innerHTML = "";
			}

			//console.log("followers: regenerating: items: ", items);


			// Loop over all items
			for( var item in items ){
				var clone = original.cloneNode(true);
				clone.removeAttribute('id');
				//console.log("followers item: ", item);

				// Add delete button click event
				const delete_button = clone.querySelectorAll('.extension-followers-item-delete-button')[0];
				delete_button.addEventListener('click', (event) => {
					var target = event.currentTarget;
					var parent3 = target.closest('.extension-followers-item');
					parent3.classList.add("delete");
			  	});

				const final_delete_button = clone.querySelectorAll('.rule-delete-confirm-button')[0];
				final_delete_button.addEventListener('click', (event) => {
					var target = event.currentTarget;
		  			var parent3 = target.closest('.extension-followers-item');
					var parent4 = parent3.parentElement;
					parent4.removeChild(parent3);
					parent4.dispatchEvent( new CustomEvent('change',{bubbles:true}) );
				});

				const cancel_delete_button = clone.querySelectorAll('.rule-delete-cancel-button')[0];
				cancel_delete_button.addEventListener('click', (event) => {
					var target = event.currentTarget;
			   		var parent3 = target.closest('.extension-followers-item');
					parent3.classList.remove("delete");

				});

				// Change switch icon
				clone.querySelector('.extension-followers-switch-checkbox').id = 'extension-followers-toggle' + this.item_number;
				clone.querySelector('.extension-followers-switch-slider').htmlFor = 'extension-followers-toggle' + this.item_number;
				this.item_number++;


				// Set speed
				/*
				if(typeof items[item].speed != 'undefined'){
					//console.log("setting speed:", 'extension-followers-speed' + this.item_number, items[item].speed);
					clone.querySelector('.extension-followers-speed').id = 'extension-followers-speed' + this.item_number;
					clone.querySelector('.extension-followers-speed').value = items[item].speed;
				}
				else{
					//console.log("speed was not defined");
				}
				*/



				// Populate the properties dropdown
				try{

					for( var thing in this.all_things ){
						//console.log("\nthis.all_things[thing]['title']: ", this.all_things[thing]['title']);
						//console.log("this.all_things[thing]['id'] = " + this.all_things[thing]['id']);
						//console.log("items[item]['thing1'] = " + items[item]['thing1']);

						if( this.all_things[thing]['id'].endsWith( items[item]['thing1'] ) ){
							//console.log("bingo, at thing1. Now to grab properties.");
							const property1_dropdown = clone.querySelector('.extension-followers-property1');
							const property_lists = this.get_property_lists(this.all_things[thing]['properties']);
							//console.log("property lists:");
							//console.log(property_lists);

							for( var title in property_lists['property1_list'] ){
								//console.log("adding prop title:" + property_lists['property1_list'][title]);
								property1_dropdown.options[property1_dropdown.options.length] = new Option(property_lists['property1_list'][title], property_lists['property1_system_list'][title]);
							}
						}
						if( this.all_things[thing]['id'].endsWith( items[item]['thing2'] ) ){
							//console.log("bongo, at thing2 (" + items[item]['thing2'] + "). Now to grab properties.");
							const property2_dropdown = clone.querySelector('.extension-followers-property2');
							//console.log(property2_dropdown);
							const property_lists = this.get_property_lists(this.all_things[thing]['properties']);
							//console.log(property_lists['property2_list']);
							for( var title in property_lists['property2_list'] ){
								//console.log("adding prop title:" + property_lists['property2_list'][title]);
								property2_dropdown.options[property2_dropdown.options.length] = new Option(property_lists['property2_list'][title], property_lists['property2_system_list'][title]);
							}
						}
					}
				}
				catch (err) {
					if (this.debug) {
						console.error("followers debug: variables: caught error looping over things: ", err);
					}
				}


				// Update to the actual values of regenerated item
				for(var key in this.item_elements){
					try {
						if(this.item_elements[key] != 'enabled'){
							if(typeof items[item][ this.item_elements[key] ] != 'undefined'){
								clone.querySelector('.extension-followers-' + this.item_elements[key] ).value = items[item][ this.item_elements[key] ];
							}
						}
					}
					catch (err) {
						if (this.debug) {
							console.error("followers debug: caught error: could not regenerate actual values of follower: ", err);
						}
					}
				}

				// Set enabled state of regenerated item
				if(items[item]['enabled'] == true){
					//clone.querySelectorAll('.extension-followers-enabled')[0].removeAttribute('checked');
					clone.querySelectorAll('.extension-followers-enabled' )[0].checked = items[item]['enabled'];
				}
				list.append(clone);
			}

		}
		catch (err) {
			if (this.debug) {
				console.error("followers debug: caught a general error in regenerate_items: ", err); // pass exception object to error handler
			}
		}
	}












	// Add a new Variable

	add_variable(){
		let variable_name = prompt("Please give the new variable a name");
		let unique_id = variable_name.replaceAll(' ', '-').replace(/[^a-zA-Z0-9]/g, '');
		if (unique_id.length > 2) {
			if (typeof this.variables[unique_id] != 'undefined' && this.variables[unique_id]['name'] == variable_name) {
				alert('That variable already exists');
				return
			}
			while (typeof this.variables[unique_id] != 'undefined') {
				unique_id += this.random_letter();
			}
			this.variables[unique_id] = { 'enabled': false, 'unique_id': unique_id, 'going_up': true, 'name': variable_name, 'triggers': {} ,'value':0}
			this.regenerate_variables();
			this.view.scrollTop = this.view.scrollHeight;
		}
	}










	//
	//  REGENERATE variables
	//

	regenerate_variables() {
		if (this.debug) {
			console.log("followers debug: in regenerate_variables.  this.all_things: ", this.all_things);
		}

		//const leader_property_dropdown = document.querySelectorAll(' #extension-variables-view #extension-variables-original-item .extension-followers-variables-property2')[0];
		//const follower_property_dropdown = document.querySelectorAll(' #extension-variables-view #extension-variables-original-item .extension-followers-variables-property2')[0];

		try {
			let items = this.variables;

			const original = this.view.querySelector('#extension-followers-variables-original-item');
			const list = this.view.querySelector('#extension-followers-variables-list');

			list.innerHTML = "";

			if (this.debug) {
				console.log("followers debug: variables: regenerating: ", items);
			}


			const generate_trigger = (unique_id=null, trigger_data=null) => {

				if (!trigger_data){
					if (this.debug) {
						console.error("followers debug: variables: generate_trigger: invalid trigger_data provided: ", trigger_data);
					}
					return
				}

				if (typeof unique_id != 'string') {
					if (this.debug) {
						console.error("followers debug: variables: generate_trigger: invalid unique_id provided: ", unique_id);
					}
					return
				}

				if (typeof trigger_data['trigger_id'] != 'string') {
					if (this.debug) {
						console.error("followers debug: variables: generate_trigger: missing trigger_id in trigger_data: ", trigger_data);
					}
					return
				}

				if (this.debug) {
					console.error("followers debug: variables: generate_trigger:  provided trigger_data: ", trigger_data);
				}

				const my_trigger_id = trigger_data['trigger_id'];

				const property_trigger_item_el = document.createElement('div');
				property_trigger_item_el.classList.add('extension-followers-variables-trigger-item');
				property_trigger_item_el.setAttribute('data-extension-followers-variables-trigger-id', trigger_data['trigger_id']);

				

				const trigger_delete_button_el = document.createElement('div');
				trigger_delete_button_el.classList.add('data-extension-followers-variables-trigger-delete-button');
				trigger_delete_button_el.classList.add('extension-followers-item-delete-button');
				property_trigger_item_el.appendChild(trigger_delete_button_el);
				
				trigger_delete_button_el.addEventListener('click', () => {
					if (this.debug) {
						console.log("deleting:  unique_id,my_trigger_id: ", unique_id, my_trigger_id);
					}
					if (typeof this.variables[unique_id] != 'undefined' && typeof this.variables[unique_id]['triggers'][my_trigger_id] != 'undefined'){
						delete this.variables[unique_id]['triggers'][my_trigger_id];
						this.handle_variable_item_change();
					}
					property_trigger_item_el.remove();
				})

				if (typeof trigger_data['type'] == 'string') {
					property_trigger_item_el.setAttribute('data-extension-followers-variables-trigger-type', trigger_data['type']);
				}

				if (typeof trigger_data['property1_type'] == 'string') {
					property_trigger_item_el.setAttribute('data-extension-followers-variables-trigger-property1-type', trigger_data['property1_type']);
				}

				

				
				if(trigger_data['type'] == 'property'){
					const property_select_container_el = document.createElement('div');
					property_select_container_el.classList.add('extension-followers-variables-trigger-item-thing-property-select-container');
					property_select_container_el.classList.add('extension-followers-item-trigger-part');

					const property_thing_select_el = document.createElement('select');
					property_thing_select_el.classList.add('extension-followers-dropdown');
					property_thing_select_el.classList.add('extension-followers-thing1');
					property_select_container_el.appendChild(property_thing_select_el);

					const property_property_select_el = document.createElement('select');
					property_property_select_el.classList.add('extension-followers-dropdown');
					property_property_select_el.classList.add('extension-followers-property1');
					property_property_select_el.innerHTML = '<option value="">-</option>';
					property_select_container_el.appendChild(property_property_select_el);


					if (typeof trigger_data['thing1'] == 'string' && typeof trigger_data['property1'] == 'string') {
						this.populate_thing_property_selector(property_thing_select_el, trigger_data['thing1'], property_property_select_el, trigger_data['property1']);
					}
					else {
						this.populate_thing_property_selector(property_thing_select_el, null, property_property_select_el, null);
					}
					property_trigger_item_el.appendChild(property_select_container_el);

					const changes_sentence_part_el = document.createElement('div');
					changes_sentence_part_el.classList.add('extension-followers-item-trigger-part');

					const changes_original_el = this.view.querySelector('#extension-followers-variables-original-change-selectors');
					var changes_clone_el = changes_original_el.cloneNode(true);
					changes_clone_el.removeAttribute('id');
					changes_sentence_part_el.appendChild(changes_clone_el);
					property_trigger_item_el.appendChild(changes_sentence_part_el)

					// populate the enum dropdown
					if (typeof trigger_data['thing1'] == 'string' && typeof trigger_data['property1'] == 'string') {
						const property_description = this.get_property_description(trigger_data['thing1'], trigger_data['property1']);
						if (this.debug) {
							console.log("followers debug: variables: generate_trigger: got property_description for thing-property?: ", trigger_data['thing1'], typeof trigger_data['property1'], property_description);
						}
						if (property_description && typeof property_description['type'] == 'string' && typeof property_description['enum'] != 'undefined' && Array.isArray(property_description['enum']) && property_description['enum'].length > 1) {
							const enum_change_el = property_trigger_item_el.querySelector('.extension-followers-change_enum_value');
							if (enum_change_el) {
								for (let ei = 0; ei < property_description['enum'].length; ei++) {
									enum_change_el.options[enum_change_el.options.length] = new Option(property_description['enum'][ei], property_description['enum'][ei]);
								}
								if (typeof trigger_data['change_enum_value'] == 'string' && trigger_data['change_enum_value'] != '' && property_description['enum'].indexOf(trigger_data['change_enum_value']) != -1) {
									if (this.debug) {
										console.log("followers debug: variables: generate_trigger: succesfully re-created enum dropdown and set its value to: ", trigger_data['change_enum_value']);
									}
									enum_change_el.value = trigger_data['change_enum_value'];
								}
							}
						}
					}

					if (trigger_data) {
						if (typeof trigger_data['boolean_change'] == 'string') {
							property_trigger_item_el.querySelector('.extension-followers-boolean_change').value = trigger_data['boolean_change'];
						}
						if (typeof trigger_data['number_change'] == 'string') {
							property_trigger_item_el.querySelector('.extension-followers-number_change').value = trigger_data['number_change'];
						}
						if (typeof trigger_data['string_change'] == 'string') {
							property_trigger_item_el.querySelector('.extension-followers-string_change').value = trigger_data['string_change'];
						}
						if (typeof trigger_data['change_value'] == 'string' || typeof trigger_data['change_value'] == 'number') {
							property_trigger_item_el.querySelector('.extension-followers-change_value').value = trigger_data['change_value'];
						}
						if (typeof trigger_data['change_enum_value'] == 'string') {
							property_trigger_item_el.querySelector('.extension-followers-change_enum_value').value = trigger_data['change_enum_value'];
						}
					}
				}
				else if(trigger_data['type'] == 'time'){
					if (this.debug) {
						console.log("regenerating time-type trigger");
					}
					const time_select_container_el = document.createElement('div');
					time_select_container_el.classList.add('extension-followers-variables-trigger-item-time-select-container');
					time_select_container_el.classList.add('extension-followers-item-trigger-part');

					// Time delta input
					const time_delta_input_el = document.createElement('input');
					time_delta_input_el.setAttribute('type','number');
					time_delta_input_el.classList.add('extension-followers-time_delta');
					if(trigger_data['time_delta']){
						time_delta_input_el.value = trigger_data['time_delta'];
					}
					/*
					if (typeof trigger_data['time_delta'] == 'number') {
						time_delta_input_el.value = trigger_data['time_delta'];
					}
					*/
					else{
						time_delta_input_el.value = 10;
					}
					time_select_container_el.appendChild(time_delta_input_el);

					// Time delta multiplier
					const time_delta_select_el = document.createElement('select');
					const time_delta_multipliers = {'1':'second(s)','60':'minute(s)','3600':'hour(s)','86400':'day(s)','31536000':'year(s)'};
					for (const [multiplier_value,multiplier_name] of Object.entries(time_delta_multipliers)) {
						const time_delta_option = new Option(multiplier_name,multiplier_value);
						//if (typeof trigger_data['time_delta_multiplier'] == 'number' && parseInt(multiplier_value) == trigger_data['time_delta_multiplier']) {
						if (typeof trigger_data['time_delta_multiplier'] == 'string' && multiplier_value == trigger_data['time_delta_multiplier']) {
							if (this.debug) {
								console.log("followers debug: variables: found the selected time multiplier");
							}
							time_delta_option.selected = true;
						}
						time_delta_select_el.options[time_delta_select_el.options.length] = time_delta_option;
					}
					time_delta_select_el.classList.add('extension-followers-dropdown');
					time_delta_select_el.classList.add('extension-followers-time_delta_multiplier');
					time_select_container_el.appendChild(time_delta_select_el);

					const passed_el = document.createElement('span');
					passed_el.classList.add('extension-followers-sentence-passed');
					passed_el.textContent = ' have passed ';
					time_select_container_el.appendChild(passed_el);

					property_trigger_item_el.appendChild(time_select_container_el);
				}


				// = document.createElement('div');
				//increases_sentence.classList.add('extension-followers-item-sentence-part');
				//increases_sentence.classList.add('extension-followers-item-sentence-part-inter');


				//const changes_it_el = document.createElement('span');
				//changes_it_el.textContent = ' changes it ';
				//property_trigger_item_el.appendChild(changes_it_el);

				const comma_el = document.createElement('span');
				comma_el.classList.add('extension-followers-sentence-comma');
				comma_el.textContent = ' , ';
				property_trigger_item_el.appendChild(comma_el);


				// Increase or Decrease

				const increase_text_el = document.createElement('span');
				increase_text_el.textContent = ' adjust ';
				increase_text_el.classList.add('extension-followers-variables-item-show-if-bounce');
				property_trigger_item_el.appendChild(increase_text_el);

				const increases_select_el = document.createElement('select');
				increases_select_el.classList.add('extension-followers-increases');
				increases_select_el.classList.add('extension-followers-variables-item-hide-if-bounce');

				const increases_option_el = document.createElement('option');
				increases_option_el.value = 'increase';
				increases_option_el.textContent = 'increase';
				increases_select_el.appendChild(increases_option_el);

				const decreases_option_el = document.createElement('option');
				decreases_option_el.value = 'decrease';
				decreases_option_el.textContent = 'decrease';
				increases_select_el.appendChild(decreases_option_el);

				const set_to_option_el = document.createElement('option');
				set_to_option_el.value = 'set_it_to';
				set_to_option_el.textContent = 'set it to';
				increases_select_el.appendChild(set_to_option_el);

				if (typeof trigger_data['increases'] == 'string') {
					increases_select_el.value = trigger_data['increases'];
				}

				property_trigger_item_el.appendChild(increases_select_el);


				// By ....
				const by_its_value_select_el = document.createElement('select');
				by_its_value_select_el.classList.add('extension-followers-by');
				by_its_value_select_el.classList.add('extension-followers-variables-item-show-if-number');

				const by_its_value_option_el = document.createElement('option');
				by_its_value_option_el.value = 'by_its_value';
				by_its_value_option_el.textContent = 'by its value';
				by_its_value_select_el.appendChild(by_its_value_option_el);

				const by_option_el = document.createElement('option');
				by_option_el.value = 'by';
				by_option_el.textContent = 'by';
				by_its_value_select_el.appendChild(by_option_el);

				if (typeof trigger_data['by'] == 'string') {
					by_its_value_select_el.value = trigger_data['by'];
				}

				property_trigger_item_el.appendChild(by_its_value_select_el);


				const by_its_value_text_el = document.createElement('span');
				by_its_value_text_el.textContent = ' by ';
				by_its_value_text_el.classList.add('extension-followers-variables-by-text');
				by_its_value_text_el.classList.add('extension-followers-sentence-word');
				by_its_value_text_el.classList.add('extension-followers-variables-item-hide-if-number');
				
				property_trigger_item_el.appendChild(by_its_value_text_el);

				const amount_el = document.createElement('input');
				amount_el.setAttribute('type', 'number');
				amount_el.setAttribute('value', '1');
				amount_el.setAttribute('placeholder', 'amount');
				amount_el.classList.add('extension-followers-amount');
				property_trigger_item_el.appendChild(amount_el);
				/*
				const increases_by_el = document.createElement('span');
				increases_by_el.textContent = ' by ';
				property_trigger_item_el.appendChild(increases_by_el);


				const its_value_el = document.createElement('span');
				its_value_el.textContent = "it's value";
				its_value_el.classList.add('extension-followers-variables-item-trigger-number-indicator');
				its_value_el.classList.add('extension-followers-variables-item-show-if-number');
				property_trigger_item_el.appendChild(its_value_el);

				const amount_el = document.createElement('input');
				amount_el.setAttribute('type','number');
				amount_el.setAttribute('value', '1');
				amount_el.setAttribute('placeholder', 'amount');
				amount_el.classList.add('extension-followers-amount');
				amount_el.classList.add('extension-followers-variables-item-hide-if-number');
				property_trigger_item_el.appendChild(amount_el);
				*/
				return property_trigger_item_el;
			}




			// Loop over all items
			let variable_ids = Object.keys(items);
			//console.log("variable_ids: ", variable_ids);
			for (var vi in variable_ids) {
				const unique_id = variable_ids[vi];
				//console.log("unique_id: ", unique_id);
				var clone = original.cloneNode(true);
				clone.removeAttribute('id');
				if (this.debug) {
					console.log("followers debug: variables: regenerate_variables:  unique_id: ", unique_id);
				}

				if (typeof this.variables[unique_id]['value'] == 'number'){
					const value_el = clone.querySelector('.extension-followers-value');
					if (value_el) {
						value_el.value = parseFloat(this.variables[unique_id]['value'].toFixed(3));

						value_el.addEventListener('change', () => {
							this.variables[unique_id]['value'] = this.ensure_number(value_el.value);
							this.update_variables_screensaver();
						})
					}
				}
				
				clone.querySelector('.extension-followers-variables-item-unique_id').textContent = unique_id;
				


				// Add delete button click event
				const delete_button = clone.querySelector('.extension-followers-item-delete-button');
				delete_button.addEventListener('click', (event) => {
					const item_el = event.currentTarget.closest('.extension-followers-item');
					if (item_el) {
						item_el.classList.add("delete");
					}
				});

				const final_delete_button = clone.querySelector('.rule-delete-confirm-button');
				final_delete_button.addEventListener('click', (event) => {
					const item_el = event.currentTarget.closest('.extension-followers-item');
					if (item_el) {
						const unique_id = item_el.getAttribute('data-extension-followers-variables-item-unique-id');
						if (typeof unique_id == 'string' && typeof this.variables[unique_id] != 'undefined'){
							delete this.variables[unique_id];
							this.save_variables();
						}
						//const list_el = item_el.parentElement;
						item_el.remove();
						//list_el.dispatchEvent(new CustomEvent('change', { bubbles: true }));

					}
					/*
					var target = event.currentTarget;
					var parent3 = target.closest('.extension-followers-item');
					var parent4 = parent3.parentElement;
					parent4.removeChild(parent3);
					parent4.dispatchEvent( new CustomEvent('change',{bubbles:true}) );
					*/
				});

				const cancel_delete_button = clone.querySelector('.rule-delete-cancel-button');
				cancel_delete_button.addEventListener('click', (event) => {
					const item_el = event.currentTarget.closest('.extension-followers-item');
					if (item_el) {
						item_el.classList.remove("delete");
					}
				});

				// Change IDs to be unique
				const enabled_checkbox_el = clone.querySelector('.extension-followers-switch-checkbox');
				if (enabled_checkbox_el){
					enabled_checkbox_el.id = 'extension-variables-toggle' + this.variables_number;
					if (typeof items[unique_id]['enabled'] == 'boolean') {
						enabled_checkbox_el.checked = items[unique_id]['enabled'];
					}
					clone.querySelector('.extension-followers-switch-slider').htmlFor = 'extension-variables-toggle' + this.variables_number;

					enabled_checkbox_el.addEventListener('change', () => {
						console.log("user toggled enabled state of Variable");
						// using a small timeout because later code can undo enabling the variable
						setTimeout(() => {
							if (typeof items[unique_id]['enabled'] == 'boolean') {
								if (items[unique_id]['enabled'] == true) {
									clone.classList.add('data-extension-followers-variables-item-is-enabled');
									
									this.regenerate_thing_properties();
									
								}
								else {
									clone.classList.remove('data-extension-followers-variables-item-is-enabled');
								}
							}
						},10);
					})
					
				}
				this.variables_number++;


				


				const trigger_elements_list_el = clone.querySelector('.extension-followers-variables-item-triggers-list');

				// + Add trigger buttons listener
				const add_trigger_buttons_container_el = clone.querySelector('.extension-followers-variables-item-trigger-buttons-container');
				if (add_trigger_buttons_container_el && trigger_elements_list_el) {

					add_trigger_buttons_container_el.addEventListener('click', (event) => {
						if (event.target.tagName == 'BUTTON') {
							const trigger_type = event.target.getAttribute('data-extension-followers-variables-trigger');
							console.log("clicked on add trigger button of type: ", trigger_type);

							if (typeof items[unique_id]['triggers'] == 'undefined') {
								items[unique_id]['triggers'] = {};
							}

							let trigger_id = '';
							while (trigger_id.length < 16) {
								trigger_id += this.random_letter();
							}
							while (this.variables[unique_id]['triggers'][trigger_id] != 'undefined' && trigger_id.length < 32) {
								trigger_id += this.random_letter();
							}
							this.variables[unique_id]['triggers'][trigger_id] = { 'trigger_id': trigger_id, 'type': trigger_type };
							//trigger_els[te].setAttribute('data-extension-followers-variables-trigger-id', trigger_id);

							if (trigger_type == 'property') {
								//this.variables[unique_id]['triggers'][trigger_id]['type'] = trigger_type;
								const new_trigger_el = generate_trigger(unique_id, this.variables[unique_id]['triggers'][trigger_id]);
								if (new_trigger_el) {
									//new_trigger_el.setAttribute('data-extension-followers-variables-trigger-property1-type', trigger_type);
									trigger_elements_list_el.appendChild(new_trigger_el);
								}
							}
							else if (trigger_type == 'time') {
								//this.variables[unique_id]['triggers'][trigger_id]['type'] = trigger_type;
								const new_trigger_el = generate_trigger(unique_id, this.variables[unique_id]['triggers'][trigger_id]);
								if (new_trigger_el) {
									//new_trigger_el.setAttribute('data-extension-followers-variables-trigger-property1-type', trigger_type);
									trigger_elements_list_el.appendChild(new_trigger_el);
								}
							}
						}
					})
				}

				if (typeof items[unique_id]['type'] == 'string') {
					clone.setAttribute('data-extension-followers-variables-item-type', items[unique_id]['type']);
				}

				if (typeof items[unique_id]['unique_id'] == 'string') {
					clone.setAttribute('data-extension-followers-variables-item-unique-id', items[unique_id]['unique_id']);
				}

				if (typeof items[unique_id]['enabled'] == 'boolean') {
					if (items[unique_id]['enabled'] == true){
						clone.classList.add('data-extension-followers-variables-item-is-enabled');
					}
					else{
						clone.classList.remove('data-extension-followers-variables-item-is-enabled');
					}
				}

				// Update to the actual values of regenerated variables item
				for (var key in this.variables_elements) {
					try {
						if (this.variables_elements[key] != 'enabled' && this.variables_elements[key] != 'triggers') {
							if (typeof items[unique_id][this.variables_elements[key]] == 'string' || typeof items[unique_id][this.variables_elements[key]] == 'number') {
								const el_to_set_value_to = clone.querySelector('.extension-followers-' + this.variables_elements[key]);
								if (el_to_set_value_to) {
									el_to_set_value_to.value = items[unique_id][this.variables_elements[key]];
								}
								else {
									if (this.debug) {
										console.error("followers debug: could not find variables element to set value to: ", '.extension-followers-' + this.variables_elements[key]);
									}
								}
							}
						}
					}
					catch (err) {
						if (this.debug) {
							console.error("followers debug: caught error setting value of input/select element in regenerate_variables: ", err);
						}
					}
				}



				// Regenerate existing triggers
				if (trigger_elements_list_el) {
					if (typeof items[unique_id]['triggers'] != 'undefined') {
						for (const trigger_details of Object.values(items[unique_id]['triggers'])) {
							const trigger_el = generate_trigger(unique_id,trigger_details);
							if (trigger_el) {
								trigger_elements_list_el.appendChild(trigger_el);
							}
						}
					}
				}




				// this.variables_trigger_elements


				// Set enabled state of regenerated item
				if (typeof items[unique_id]['enabled'] == true) {
					//clone.querySelectorAll('.extension-followers-variables-enabled')[0].removeAttribute('checked');
					clone.querySelector('.extension-followers-enabled').checked = items[unique_id]['enabled'];
				}
				list.append(clone);
			}

			this.update_variables_screensaver();

			if(this.screensaver_scroll && Object.keys(this.variables).length > 10){
				this.view.classList.add('extension-followers-screensaver-scroll');
			}
			else{
				this.view.classList.remove('extension-followers-screensaver-scroll');
			}

		}
		catch (err) {
			if (this.debug) {
				console.error("followers debug: variables: caught a general error in regenerate_variables: ", err);
			}
		}
	}






	populate_thing_property_selector( thing_dropdown_el, selected_thing_id=null, property_dropdown_el=null, selected_property_id=null){
		console.log("in populate_thing_property_selector.  selected_thing_id,selected_property_id: ", selected_thing_id, selected_property_id);

		if (!thing_dropdown_el) {
			console.error("populate_thing_property_selector: no select el provided");
			return
		}

		try {
			thing_dropdown_el.innerHTML = '<option value="">-</option>';
			if(property_dropdown_el){
				property_dropdown_el.innerHTML = '<option value="">-</option>';
			}

			for( var thing in this.all_things ){
				//console.log("\npopulate_thing_property_selector: this.all_things[thing]['title']: ", this.all_things[thing]['title']);
				//console.log("populate_thing_property_selector: this.all_things[thing]['id'] = " + this.all_things[thing]['id']);
				
				let thing_id = this.all_things[thing]['id'];
				const slash_index = this.all_things[thing]['id'].lastIndexOf('/');
				if (slash_index != -1){
					thing_id = this.all_things[thing]['id'].substring(slash_index + 1);
				}
				//console.log("populate_thing_property_selector:  thing_id,selected_thing_id: ", thing_id, " =?= ", selected_thing_id);
				
				if (thing_id == 'candle-variables'){
					continue
				}

				const thing_option_el = document.createElement('option');
				thing_option_el.value = thing_id;
				thing_option_el.textContent = this.all_things[thing]['title'];

				thing_dropdown_el.appendChild(thing_option_el);

				if (typeof selected_thing_id == 'string' && thing_id == selected_thing_id && property_dropdown_el ){
					if (this.debug) {
						console.log("followers debug: variables: populate_thing_property_selector: pre-populating properties dropdown");
					}
					//const property1_dropdown = clone.querySelectorAll('.extension-followers-variables-property1')[0];
					const property_lists = this.get_property_lists(this.all_things[thing]['properties'], false); // false = do not skip booleans
					if (this.debug) {
						console.log("followers debug: variables: - property lists: ", property_lists);
					}
					//console.log(property_lists);

					for( var title in property_lists['property1_list'] ){
						//console.log("adding prop title:" + property_lists['property1_list'][title]);
						const property_option = new Option(property_lists['property1_list'][title], property_lists['property1_system_list'][title]);
						if (typeof selected_property_id == 'string' && property_lists['property1_list'][title] == selected_property_id) {
							if (this.debug) {
								console.log("followers debug: variables: populate_thing_property_selector: found the selected property");
							}
							property_option.selected = true;
						}
						property_dropdown_el.options[property_dropdown_el.options.length] = property_option;
					}

					const actions_lists = this.get_actions_lists(this.all_things[thing]);
					if (this.debug) {
						console.log("followers debug: variables: actions_lists: ", actions_lists);
					}
					for (var title in actions_lists) {
						if (this.debug) {
							console.log("followers debug: variables: adding action title:", actions_lists[title]);
						}
						const property_option = new Option(actions_lists[title], actions_lists[title]);
						if (typeof selected_property_id == 'string' && actions_lists[title] == selected_property_id) {
							if (this.debug) {
								console.log("followers debug: variables: populate_thing_property_selector: found the selected action");
							}
							property_option.selected = true;
						}
						property_dropdown_el.options[property_dropdown_el.options.length] = property_option;
					}

					// TODO: events

					property_dropdown_el.value = selected_property_id;
					
				}
			}

			if(typeof selected_thing_id == 'string'){
				thing_dropdown_el.value = selected_thing_id;
			}

		}
		catch (err) {
			if (this.debug) {
				console.error("followers debug: variables: caught error in populate_thing_property_selector: ", err);
			}
		}
	}









	//
	//  A helper method that generates nice lists of actions that a thing can trigger
	//
	// TODO: Is this still used?
	get_actions_lists(thing) {
		if (this.debug) {
			console.log("followers debug: variables: in get_actions_list:  thing: ", thing);
		}
		var actions_list = []; // list of user friendly titles
		try{
			if (typeof thing['actions'] != 'undefined') {
				actions_list = Object.keys(thing['actions']);
			}
		}
		catch(err){
			if(this.debug){
				console.error("followers debug: variables: caught error in get_actions_lists: ", err);
			}
		}
		return actions_list;
	}


	//
	//  A helper method that generates nice lists of properties from a Gateway property dictionary
	//
	// It can also return the property description dict of a single property if 'specific_property' is set to a property_id string
	// TODO: the strange structure or returning multiple lists
	get_property_lists(properties, skip_booleans=true, specific_property=null){
		var property1_list = []; // list of user friendly titles
		var property1_system_list = []; // list internal property id's
		var property2_list = [];
		var property2_system_list = [];

		for (let prop in properties){
			var title = 'unknown';
			if( properties[prop].hasOwnProperty('title') ){
				title = properties[prop]['title'];
			}
			else if( properties[prop].hasOwnProperty('label') ){
				title = properties[prop]['label'];
			}
			//console.log(title);

			var system_title = null;
			try{
				var links_source = null;
				if( typeof properties[prop]['forms'] != 'undefined'){
					if(properties[prop]['forms'].length > 0){
						//console.log('valid href source in forms object');
						links_source = 'forms';
						//system_title = properties[prop]['forms'][0]['href'].substr(properties[prop]['forms'][0]['href'].lastIndexOf('/') + 1);
					}
					else{
						//console.log("forms existed, but was empty");
					}
				}

				if( links_source == null && typeof properties[prop]['links'] != 'undefined'){
					if(properties[prop]['links'].length > 0){
						//console.log('valid href source in links object');
						links_source = 'links';
					}
					else{
						//console.log("links existed, but was empty");
					}
				}
				//console.log("final links_source: " + links_source);

				if(links_source != null){
					system_title = properties[prop][links_source][0]['href'].substr(properties[prop][links_source][0]['href'].lastIndexOf('/') + 1);
				}else{
					//console.log('Error, no valid links source found?');
				}

				//console.log('final system_title: ' + system_title);
			}
			catch(err){
				if (this.debug) {
					console.log("followers debug: variables: caught forms/links error: ", err);
				}
			}


			if (typeof specific_property == 'string' && system_title == specific_property){
				return properties[prop];
			}

			// If a property is a number, add it to the list of possible source properties
			if ( skip_booleans && (properties[prop]['type'] == 'integer' || properties[prop]['type'] == 'float' || properties[prop]['type'] == 'number')){

				property1_list.push(title);
				property1_system_list.push(system_title);

				// If a property is not read-only, then it can be added to the list of 'target' properties that can be changed based on a 'source' property
				if ( 'readOnly' in properties[prop] ) { // If readOnly is set, it could still be set to 'false'.
					if(properties[prop]['readOnly'] == false){
						property2_list.push(title);
						property2_system_list.push(system_title);
					}
				}
				else{ // If readOnly is not set, we can asume the property is not readOnly.
					property2_list.push(title);
					property2_system_list.push(system_title);
				}
			}
			else{
				property1_list.push(title);
				property1_system_list.push(system_title);
			}
		}

		// Sort lists alphabetically.
		/*
		property1_list.sort();
		property1_system_list.sort();
		property2_list.sort();
		property2_system_list.sort();
		*/

		return { 'property1_list': property1_list, 'property1_system_list': property1_system_list, 'property2_list': property2_list, 'property2_system_list': property2_system_list };
	}


	get_property_description(desired_thing_id, desired_property_id) {
		if (this.debug) {
			console.log("followers debug: variables: in get_property_description.  desired_thing_id, desired_property_id: ", desired_thing_id, desired_property_id);
		}
		if (typeof desired_thing_id == 'string' && typeof desired_property_id == 'string'){
			for (var thing in this.all_things) {
				//console.log("\npopulate_thing_property_selector: this.all_things[thing]['title']: ", this.all_things[thing]['title']);
				//console.log("populate_thing_property_selector: this.all_things[thing]['id'] = " + this.all_things[thing]['id']);

				let thing_id = this.all_things[thing]['id'];
				const slash_index = this.all_things[thing]['id'].lastIndexOf('/');
				if (slash_index != -1) {
					thing_id = this.all_things[thing]['id'].substring(slash_index + 1);
				}

				//console.log("populate_thing_property_selector:  thing_id,selected_thing_id: ", thing_id, " =?= ", selected_thing_id);

				if (thing_id == desired_thing_id) {
					if (this.debug) {
						console.log("followers debug: variables: get_property_description: found the thing: ", this.all_things[thing]);
					}
					if (typeof this.all_things[thing].properties != 'undefined') {
						return this.get_property_lists(this.all_things[thing].properties, false, desired_property_id);
					}
				}
			}
		}
		return null
	}
	
	
	regenerate_thing_properties(){
		if (this.debug) {
			console.log("followers debug: variables: in regenerate_thing_properties");
		}
		
  		// Get list of items
		window.API.postJson(
		  `/extensions/${this.id}/api/regenerate_thing`
		).then((body) => {
			if (this.debug) {
				console.log("followers debug: variables: regenerate_thing_properties: response: ", body);
			}
		})
		.catch((err) => {
			console.error("followers debug: variables:  caught error calling")
		})
	}
	
	


	start_variables_screensaver(){
		if (this.debug) {
			console.log("followers debug: variables: in start_variables_screensaver");
		}
		/*
		const variables_content_el = this.view.querySelector('#extension-followers-variables-content');
		if (variables_content_el){
			variables_content_el.classList.add('extension-followers-variables-screensaver');
		}
		*/
		document.body.classList.add('screensaver');
		
		//this.showing_screensaver = true;
		
		this.update_variables_screensaver();
	}


	update_variables_screensaver(){
		let variable_ids = Object.keys(this.variables);
		if(this.debug){
			console.log("followers debug: update_variables_screensaver: variable_ids: ", variable_ids);
		}

		//const list_el = this.view.querySelector('#extension-followers-variables-list');

		for (var vi in variable_ids) {
			const unique_id = variable_ids[vi];
			this.update_variables_screensaver_item(unique_id);
		}
	}
	

	update_variables_screensaver_item(unique_id=null){
		if(this.debug){
			console.log("in update_variables_screensaver_item.  unique_id: ", unique_id);
		}
		if(typeof unique_id == 'string'){
			const variable_item_el = this.view.querySelector('.extension-followers-item[data-extension-followers-variables-item-unique-id="' + unique_id + '"');
			if (variable_item_el){
				if(typeof this.variables[unique_id]['value'] == 'undefined'){
					if(this.debug){
						console.error("\nfollowers debug: variables: missing value: ", this.variables[unique_id]);
					}
					return
				}
				let pixel_value = this.variables[unique_id]['value'];
				if (typeof pixel_value == 'string'){
					pixel_value = parseInt(pixel_value);
				}
				if (typeof pixel_value != 'number') {
					return
				}
				
				pixel_value = Math.abs(Math.round(pixel_value));
				if(this.debug){
					console.log("\nfollowers debug: update_variables_screensaver: pixel_value before: ", pixel_value);
				}
			
				let scaling_factor = 1;
				if (this.variables[unique_id]['type'] == 'range' || this.variables[unique_id]['type'] == 'loop' || this.variables[unique_id]['type'] == 'bounce'){
					if (typeof this.variables[unique_id]['limit1'] == 'number' && typeof this.variables[unique_id]['limit2'] == 'number'){
						let allowed_range = Math.abs(this.variables[unique_id]['limit2'] - this.variables[unique_id]['limit1']);
						scaling_factor = 100 / allowed_range;
					}
					pixel_value = pixel_value * scaling_factor;
					//pixel_value += 10;
				}
				else{
					pixel_value = pixel_value % 100;
				}

				pixel_value += 20;
				/*
				if (pixel_value == 10){
					pixel_value = 60;
				}
				*/

				if (this.debug) {
					console.log("followers debug: update_variables_screensaver: pixel_value after: ", pixel_value);
				}

				variable_item_el.style.setProperty('--s', pixel_value + 'px');
				const variables_item_value_container_bg_el = variable_item_el.querySelector('.extension-followers-variables-value-container-bg');
				if(variables_item_value_container_bg_el){
					variables_item_value_container_bg_el.style.setProperty('--s', pixel_value + 'px');
				}
			}
		}
	}


	stop_variables_screensaver(){
		if (this.debug) {
			console.log("followers debug: variables: in stop_variables_screensaver");
		}
		/*
		const variables_content_el = this.view.querySelector('#extension-followers-variables-content');
		if (variables_content_el){
			variables_content_el.classList.remove('extension-followers-variables-screensaver');
		}
		*/
		document.body.classList.remove('screensaver');
		//this.showing_screensaver = false;
	}


  }

  new Followers();

})();
