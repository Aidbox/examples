# aidbox-forms-angular

Example of integration Aidbox Forms Builder with Angular.js

## Example

```js
<aidbox-form-builder
  style="width: 100%; border: none; align-self: stretch; display: flex"
  form-id="{{ id }}"
  show-share
  hide-back
>
</aidbox-form-builder>
```

## Available attributes
* `base-url` - optional, base url of your Aidbox instance, default is https://form-builder.aidbox.app
* `style` - optional, style of the underlying iframe
* `form-id` - required, id of the form to load
* `hide-back` - optional, hide back button
* `hide-publish` - optional, hide publish button
* `hide-save` - optional, hide save button
* `show-share` - optional, show share button
