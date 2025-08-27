# aidbox-forms-renderer-angular-controlled

In controlled mode, integrating the Aidbox Forms Renderer with Angular.js
involves passing the questionnaire and optionally questionnaire response as attributes to the Forms
Renderer component. Changes made within the form are emitted to the parent
component through events. In this configuration, the resources are neither
loaded from nor saved to Aidbox, allowing for full management of the 
resources within the Angular.js application. This approach is 
beneficial for applications requiring custom resource handling and
management.

[Demo](https://aidbox.github.io/examples/aidbox-forms-renderer-angular-controlled/)

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
Please refer to [Aidbox Forms documentation](https://docs.aidbox.app/modules/aidbox-forms/aidbox-ui-builder-alpha/embedding-renderer) for more information about available attributes.
