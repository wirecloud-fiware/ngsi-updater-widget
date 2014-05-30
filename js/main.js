/*global MashupPlatform StyledElements NGSI*/

(function () {
 
    "use strict";

    var layout,
        ngsi,
        form,
        currentData;

    var create_ngsi_connection = function create_ngsi_connection() {
        ngsi = new NGSI.Connection(MashupPlatform.prefs.get('ngsi_server'), {
            use_user_fiware_token: true,
        });
    };

    var init = function init() {
        layout = new StyledElements.BorderLayout({'class': 'loading'});
        var fields = {
            "entity" : {
                label: 'Entity Id',
                type: 'select',
                initialEntries: [{
                    label: "-------------------",
                    value: ""
                }],
                required: true
            },
            "attribute" : {
                label: 'Attribute Name',
                type: 'select',
                initialEntries: [{
                    label: "-------------------",
                    value: ""
                }],
                required: true
            },
            "value" : {
                label: 'Attribute Value',
                type: 'text',
                required: true
            }
        };
        form = new StyledElements.Form(fields, {cancelButton: false});
        form.addEventListener("submit", updateEntity);
        form.fieldInterfaces.entity.inputElement.addEventListener('change', onEntityChange);
        form.fieldInterfaces.attribute.inputElement.addEventListener('change', onAttributeChange);
        layout.getCenterContainer().appendChild(form);

        layout.insertInto(document.body);
        layout.repaint();
        create_ngsi_connection();
        doQuery();
    };

    var onEntityChange = function onEntityChange(select) {
        var attribute_values = currentData[select.getValue()];
        var attributes = Object.keys(attribute_values);
        var old_attribute = form.fieldInterfaces.attribute.inputElement.getValue();
        var entries = [];

        for (var i = 0; i < attributes.length; i++) {
            if (['id', 'type'].indexOf(attributes[i]) === -1) {
                entries.push({value: attributes[i]});
            }
        }

        form.fieldInterfaces.attribute.inputElement.clear();
        form.fieldInterfaces.attribute.inputElement.addEntries(entries);
        if (attributes.indexOf(old_attribute) !== -1) {
            form.fieldInterfaces.attribute.inputElement.setValue(old_attribute);
        }
        onAttributeChange(form.fieldInterfaces.attribute.inputElement);
    };

    var onAttributeChange = function onAttributeChange(select) {
        var entity = form.fieldInterfaces.entity.inputElement.getValue();
        var attribute_values = currentData[entity];
        var attribute = form.fieldInterfaces.attribute.inputElement.getValue();

        form.fieldInterfaces.value.inputElement.setValue(attribute_values[attribute]);
    };

    var doQuery = function doQuery() {
        layout.disable();

        ngsi.query([{
               isPattern: true,
               id: MashupPlatform.prefs.get('entity_id_pattern')
           }],
           null,
           {
              flat: true,
              onSuccess: onQuerySuccess
           }
        );
    };

    var onQuerySuccess = function onQuerySuccess(data) {
        var entries = [];
        currentData = data;

        for (var key in data) {
            entries.push({value: key});
        }

        form.fieldInterfaces['entity'].inputElement.clear();
        form.fieldInterfaces['entity'].inputElement.addEntries(entries);
        onEntityChange(form.fieldInterfaces.entity.inputElement);

        layout.enable();
    };

    var updateEntity = function updateEntity(form, data) {
        var attributes =  [{
                'name': data.attribute,
                'contextValue': data.value
            }];

        if ('TimeInstant' in currentData[data.entity]) {
            attributes.push({
                'name': 'TimeInstant',
                'contextValue': (new Date()).toISOString()
            });
        }

        ngsi.updateAttributes([
                {
                    'entity': {'id': data.entity},
                    'attributes': attributes
                }
            ], {
                onSuccess: onUpdateAttributesSuccess,
                onFailure: function (e) {
                    document.getElementById('update_context_update').textContent = 'Fail';
                    fail();
                }
            }
        );
    };

    var onUpdateAttributesSuccess = function onUpdateAttributesSuccess() {
        form.enable();
    };

    MashupPlatform.prefs.registerCallback(function (new_values) {
        if ('ngsi_server' in new_values) {
            create_ngsi_connection();
        }

        doQuery();
    }.bind(this));

    MashupPlatform.widget.context.registerCallback(function (newValues) {
        if (layout && "heightInPixels" in newValues) {
             layout.repaint();
        }
    }.bind(this));

    window.addEventListener("DOMContentLoaded", init, false);

})();
