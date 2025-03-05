# Smart App Launch Subscriptions Widget

This application is a JavaScript widget that needs to be built before embedding it into a third-party project.

## Building the Widget Locally

To build the widget, run the following commands:

```sh
npm i
npm run build
```

The built files will be stored in the `dist` folder.

## Using the Widget

To use this widget in your project, copy the JavaScript and CSS files from the `dist` folder into your application. Then, include them in your HTML file as follows:

```html
<script src="./smart-app-launch.subscriptions.umd.js"></script>
```

After adding the script to your page, the window.SmartAppLaunchSubscriptions object should be available. This allows you to initialize the widget using the following script:

```html
<script>
  document.addEventListener('DOMContentLoaded', () => {
    if (window.SmartAppLaunchSubscriptions) {
      window.SmartAppLaunchSubscriptions.init('notifications-container', {
        apiKey: 'http://localhost:9000'
      });
    } else {
      console.error('SmartAppLaunchSubscriptions is not defined');
    }
  });
</script>
```

## `init` Function Parameters

The `init` function is used to set up the widget. It requires two parameters:

### `init(containerId, options)`

- `containerId` *(string, required)* – The `id` of an HTML element where the widget will be rendered.  
  **Example:** If your HTML page contains the following element:

  ```html
  <div id="notifications-container"></div>
  ```

  Then you should pass `'notifications-container'` as the first parameter when calling `init`.

- `options` *(object, required)* – An object containing configuration options for the widget.  
  Available options:
  - `apiKey` *(string, required)* – URL of the `Smart App Subscriptions` backend service.
  - `width` *(number, optional)* – Width of the widget in pixels.
  - `height` *(number, optional)* – Height of the widget in pixels.


## `setUser` Function

The `setUser` function is used to set the logged-in practitioner for the widget. This ensures that the widget subscribes to events related to the specified practitioner.

### `setUser(practitionerId)`

- `practitionerId` *(string or `null`, required)* – The `id` of the practitioner whose events should be tracked.  
  If `null` is passed, the widget will unsubscribe from all events.

### Example Usage:

```js
const response = await fetch(`${AIDBOX_URL}/auth/token`, {
  // authentication request
});
const loginData = await response.json();
const practitionerId = loginData.userinfo.data?.practitioner?.id;

if (window.SmartAppLaunchSubscriptions) {
  window.SmartAppLaunchSubscriptions.setUser(practitionerId);
}
```

To unsubscribe from all events, pass `null`:

```js
window.SmartAppLaunchSubscriptions.setUser(null);
```