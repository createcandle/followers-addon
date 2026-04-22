# Followers & Variables

This addon adds two new features to the Candle Controller, both with their own interface.


## Followers
Allow properties to follow each other's changes, live. For example, you could:
- Have multiple lightbulbs change brightness by following closely how one lightbulb changes brightness.
- A volume control knob could be linked to the brightness of a lamp. The higher the volume, the brighter the lightbulb.
- A lightbulb's brightness could correspond with the current level of air pollution.

You can also do a reverse follow, where one value rises as another one lowers. For example:
- A lightbulb could respond to how much sunlight another sensor has detected. As the sun goes down, your light can automatically increase in brightness.

![name-of-you-image](https://github.com/flatsiedatsie/followers-addon/blob/master/followers_screenshot.png?raw=true)

## Variables
This allows you to create variable values that increase or decrease depending on all kinds of things happening on your controller.
For example, you could create a variable called "livingroom brightness", which goes up when you press button A on some device, and goes down when you press button B on some device. A remote control, for example. You can limit that variable's possible values. In this case, a minimum of 0 and a maximum of 100 would make sense.

Variables are a great starting point for creating Followers. For example, the "livingroom brightness" variable could be "followed" by all your livingroom lights.

Together they form a nice automation system that compliment the other options (such as creating rulels and scenes).

