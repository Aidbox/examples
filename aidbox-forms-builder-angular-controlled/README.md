# aidbox-forms-builder-angular-controlled

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
<aidbox-form-builder
  style="width: 100%; border: none; align-self: stretch; display: flex"
  value="{{ questionnaire-json-as-string }}"
  ng-on-change="handleFormChange($event)"
  ng-on-ready="handleFormReady($event)"
  show-share
  hide-back
  hide-save
  hide-publish
>
</aidbox-form-builder>
```

## Available attributes
* `base-url` - optional, base url of your Aidbox instance, default is https://form-builder.aidbox.app
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `value` - required, questionnaire as a JSON string
* `hide-back` - optional, hide back button
* `hide-publish` - optional, hide publish button
* `hide-save` - optional, hide save button
* `show-share` - optional, show share button

## Events
* `change` - emitted when the questionnaire is modified, triggered on every change or when the save or publish button is clicked. `event.detail` contains the modified questionnaire as JSON object.
* `ready` - emitted when Aidbox Forms Builder is loaded and ready to be used.
* `select` - emmited when an item is selected in the item list. `event.detail` contains the selected item as JSON object.
