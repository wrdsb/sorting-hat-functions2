import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";

const peopleSetDefinitionStore: AzureFunction = async function (context: Context, triggerMessage: any): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.SortingHat.PeopleSetDefinition.Store';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-people-set-definition-store-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const triggerObject = triggerMessage;

    const operation = triggerObject.operation;
    const payload = triggerObject.payload;

    let oldRecord = context.bindings.recordIn;
    let newRecord;
    let result;

    let statusCode;
    let statusMessage;

    switch (operation) {
        case 'delete':
            result = doDelete(oldRecord, payload);
            statusCode = '200';
            statusMessage = 'Success: Marked record deleted.';
            break;
        case 'patch':
            result = doPatch(oldRecord, payload);
            statusCode = '200';
            statusMessage = 'Success: Patched record.';
            break;
        case 'replace':
            result = doReplace(oldRecord, payload);
            statusCode = '200';
            statusMessage = 'Success: Replaced record.';
            break;
        default:
            break;
    }

    context.bindings.recordOut = result.newRecord;

    const logPayload = result.event;

    const logObject = await createLogObject(functionInvocationID, functionInvocationTime, functionName, logPayload);
    const logBlob = await createLogBlob(logStorageAccount, logStorageKey, logStorageContainer, logObject);
    context.log(logBlob);

    const callbackMessage = await createCallbackMessage(logObject, 200);
    context.bindings.callbackMessage = JSON.stringify(callbackMessage);
    context.log(callbackMessage);

    const invocationEvent = await createEvent(
        functionInvocationID,
        functionInvocationTime,
        functionInvocationTimestamp,
        functionName,
        functionEventType,
        functionEventID,
        functionLogID,
        logStorageAccount,
        logStorageContainer,
        eventLabel,
        eventTags
    );
    context.bindings.flynnEvent = JSON.stringify(invocationEvent);
    context.log(invocationEvent);

    context.done(null, logBlob);

    // TODO inject event crafting function so we can generalize this function
    // and still publish custom events

    function doDelete(oldRecord, payload)
    {
        let event = {};
        let newRecord = {
            created_at: '',
            updated_at: '',
            deleted_at: '',
            deleted: false
        };

        // check for existing record
        if (!oldRecord) {
            newRecord = Object.assign(newRecord, payload);
            newRecord.created_at = functionInvocationTimestamp;
            newRecord.updated_at = functionInvocationTimestamp;

            // mark the record as deleted
            newRecord.deleted_at = functionInvocationTimestamp;
            newRecord.deleted = true;

            event = craftPeopleSetDefinitionDeleteEvent(oldRecord, newRecord);

        } else {
            newRecord = Object.assign(newRecord, oldRecord);

            // mark the record as deleted
            newRecord.deleted_at = functionInvocationTimestamp;
            newRecord.deleted = true;

            event = craftPeopleSetDefinitionDeleteEvent(oldRecord, newRecord);
        }

        return {event: event, newRecord: newRecord};
    }

    function doPatch(oldRecord, payload)
    {
        let event = {};
        let newRecord = {
            created_at: '',
            updated_at: '',
            deleted_at: '',
            deleted: false
        };

        if (!oldRecord) {
            newRecord = Object.assign(newRecord, payload);
            newRecord.created_at = functionInvocationTimestamp;
            newRecord.updated_at = functionInvocationTimestamp;
    
            // patching a record implicitly undeletes it
            newRecord.deleted_at = '';
            newRecord.deleted = false;
    
            event = craftPeopleSetDefinitionCreateEvent(oldRecord, newRecord);

        } else {
            // Merge request object into current record
            newRecord = Object.assign(newRecord, oldRecord, payload);
            newRecord.updated_at = functionInvocationTimestamp;
    
            // patching a record implicitly undeletes it
            newRecord.deleted_at = '';
            newRecord.deleted = false;
    
            event = craftPeopleSetDefinitionUpdateEvent(oldRecord, newRecord);
        }

        return {event: event, newRecord: newRecord};
    }
    
    function doReplace(oldRecord, payload)
    {
        let event = {};
        let newRecord = {
            created_at: '',
            updated_at: '',
            deleted_at: '',
            deleted: false
        };

        newRecord = Object.assign(newRecord, payload);

        if (!oldRecord) {
            newRecord.created_at = functionInvocationTimestamp;
            newRecord.updated_at = functionInvocationTimestamp;

            // replacing a record implicitly undeletes it
            newRecord.deleted_at = '';
            newRecord.deleted = false;
        
            event = craftPeopleSetDefinitionCreateEvent(oldRecord, newRecord);

        } else {
            newRecord.created_at = oldRecord.created_at;
            newRecord.updated_at = functionInvocationTimestamp;

            // replacing a record implicitly undeletes it
            newRecord.deleted_at = '';
            newRecord.deleted = false;
        
            event = craftPeopleSetDefinitionUpdateEvent(oldRecord, newRecord);
        }

        return {event: event, newRecord: newRecord};
    }

    function craftPeopleSetDefinitionCreateEvent(old_record, new_record)
    {
        let event_type = 'SortingHat.PeopleSetDefinition.Create';
        let source = 'create';
        let schema = 'create';
        let label = `${new_record.email} people set definition created.`;
        let payload = {
            record: new_record
        };

        let event = craftEvent(new_record.id, source, schema, event_type, label, payload);
        return event;
    }
    
    function craftPeopleSetDefinitionUpdateEvent(old_record, new_record)
    {
        let event_type = 'SortingHat.PeopleSetDefinition.Update';
        let source = 'update';
        let schema = 'update';
        let label = `${new_record.email} people set definition updated.`;
        let payload = {
            old_record: old_record,
            new_record: new_record,
        };

        let event = craftEvent(new_record.id, source, schema, event_type, label, payload);
        return event;
    }

    function craftPeopleSetDefinitionDeleteEvent(old_record, new_record)
    {
        let event_type = 'SortingHat.PeopleSetDefinition.Delete';
        let source = 'delete';
        let schema = 'delete';
        let label = `${old_record.email} people set definition deleted.`;
        let payload = {
            record: old_record
        };

        let event = craftEvent(old_record.id, source, schema, event_type, label, payload);
        return event;
    }

    function craftEvent(recordID, source, schema, event_type, label, payload) {
        let event = {
            id: `${event_type}-${context.executionContext.invocationId}`,
            time: functionInvocationTimestamp,

            type: event_type,
            source: `/sorting-hat/people-set-definition/${recordID}/${source}`,
            schemaURL: `ca.wrdsb.sorting-hat.people-set-definition.${schema}.json`,

            label: label,
            tags: [
                "sorting-hat", 
                "people-set-definition"
            ], 

            data: {
                function_name: context.executionContext.functionName,
                invocation_id: context.executionContext.invocationId,
                result: {
                    payload: payload 
                },
            },

            eventTypeVersion: "0.1",
            specversion: "0.2",
            contentType: "application/json"
        };

        // TODO: check message length
        return event;
    }
};

export default peopleSetDefinitionStore;
