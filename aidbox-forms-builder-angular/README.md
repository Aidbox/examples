# aidbox-forms-builder-angular

Example of integration Aidbox Forms Builder with Angular.js

[Online demo](https://aidbox.github.io/examples/aidbox-forms-builder-angular/)


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
* `base-url` - optional, base url of your Aidbox instance, default is the url of Aidbox instance the script is loaded from
* `style` - optional, style of the underlying iframe
* `token` - optional, JWT token to authenticate the user
* `form-id` - optional, id of the form to load, if not provided, builder will be opened with a blank form
* `hide-back` - optional, hide back button
* `hide-publish` - optional, hide publish button
* `hide-save` - optional, hide save button
* `show-share` - optional, show share button
