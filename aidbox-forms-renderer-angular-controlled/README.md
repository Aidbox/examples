# aidbox-forms-renderer-angular-controlled

In controlled mode, integrating the Aidbox Forms Renderer with Angular.js
involves passing the questionnaire and optionally questionnaire response as attributes to the Forms
Renderer component. Changes made within the form are emitted to the parent
component through events. In this configuration, the resources are neither
loaded from nor saved to Aidbox, allowing for full management of the 
resources within the Angular.js application. This approach is 
beneficial for applications requiring custom resource handling and
management.

[Online demo](https://aidbox.github.io/examples/aidbox-forms-renderer-angular-controlled/)

## Example

```js
<aidbox-form-renderer
  style="width: 100%; border: none; align-self: stretch; display: flex"
  questionnaire="{{ questionnaire }}"
  ng-on-change="handleChange($event)"
  ng-on-ready="handleReady($event)"
>
</aidbox-form-renderer>
```

## Available attributes
* `base-url` - optional, base url of your Aidbox instance, default is the url of Aidbox instance the script is loaded from
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `questionnaire` - required, questionnaire as a JSON string
* `questionnaire-response` - optional, questionnaire response as a JSON string

## Events
* `change` - emitted when the questionnaire response is modified, triggered on auto-save or when submit button is clicked. `event.detail` contains the modified questionnaire response as JSON object.
* `ready` - emitted when Aidbox Forms Renderer is loaded and ready to be used.
