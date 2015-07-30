/*global MashupPlatform StyledElements NGSI*/

(function () {
 
    "use strict";

    var layout,
        ngsi,
        form,
        currentData,
        error,
        info;

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

        //Create the error div
        error = document.createElement('div');
        error.setAttribute('class', 'alert alert-danger div_spaced');
        layout.getCenterContainer().appendChild(error);

        //Create the warn div
        info = document.createElement('div');
        info.setAttribute('class', 'alert alert-success div_spaced');
        layout.getCenterContainer().appendChild(info);

        hiddeStautsDivs();

        layout.repaint();
        create_ngsi_connection();
        doQuery();
    };

    var fail = function fail(msg) {
        error.innerHTML = msg;
        error.classList.remove('hidden');
        info.classList.add('hidden');
    }

    var complete = function complete(msg) {
        info.innerHTML = msg ? msg : 'Complete!';
        error.classList.add('hidden');
        info.classList.remove('hidden');
    }

    var hiddeStautsDivs = function hiddeStautsDivs() {
        info.classList.add('hidden');
        error.classList.add('hidden');
    }

    var onEntityChange = function onEntityChange(select) {
        var attribute_values = currentData[select.getValue()];

        if (attribute_values == null) {
            attribute_values = {};
        }

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
        form.disable();
        hiddeStautsDivs();

        var id = {
            isPattern: true,
            id: MashupPlatform.prefs.get('entity_id_pattern')
        };

        var type = MashupPlatform.prefs.get('entity_types');
        if (type !== '') {
            id.type = type;
        }

        ngsi.query([
                id
            ],
            null,
            {
                flat: true,
                onSuccess: onQuerySuccess,
                onFailure: onQueryFail
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

        form.enable();
    };

    var onQueryFail = function onQueryFail(e) {
        form.disable();
        fail('Fail querying the server: ' + e);
    }

    var updateEntity = function updateEntity(form, data) {
        form.disable();
        hiddeStautsDivs();

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
                onFailure: onUpdateAttributesFail
            }
        );
    };

    var onUpdateAttributesFail = function onUpdateAttributesFail(e) {
        form.enable();
        fail('Fail updating Attribute: ' + e);
    }

    var onUpdateAttributesSuccess = function onUpdateAttributesSuccess() {
        form.enable();
        complete('Attribute updated correctly');
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
