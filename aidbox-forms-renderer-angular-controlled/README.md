# aidbox-forms-renderer-angular-controlled

In controlled mode, integrating the Aidbox Forms Builder with Angular.js
involves passing the editing questionnaire as an attribute to the Forms
Builder component. Changes made within the form are emitted to the parent
component through events. In this configuration, questionnaires are neither
loaded from nor saved to Aidbox, allowing for full management of the 
questionnaire within the Angular.js application. This approach is 
beneficial for applications requiring custom questionnaire handling and
management.

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
* `base-url` - optional, base url of your Aidbox instance, default is https://form-builder.aidbox.app
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `questionnaire` - required, questionnaire as a JSON string
* `questionnaire-response` - optional, questionnaire response as a JSON string

## Events
* `change` - emitted when the questionnaire response is modified, triggered on auto-save or when submit button is clicked. `event.detail` contains the modified questionnaire response as JSON object.
* `ready` - emitted when Aidbox Forms Renderer is loaded and ready to be used.
