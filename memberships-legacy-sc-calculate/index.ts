import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsLegacySCCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.LegacySC.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-legacy-sc-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'legacy-set-memberships-now';

    const rows = context.bindings.iamwpRaw;
    const legacySCSets = context.bindings.legacySCSets;

    const excluded_job_codes = ['6106', '6118'];
    const activity_codes = ['ACTIVE', 'ONLEAVE'];

    let calculated_members = await calculateMembers(rows);
    let blob_results = await parseMembers(calculated_members);

    let response = {};
    response['count'] = 0;
    
    blob_results.forEach(function(blob) {
        response[blob.name] = blob.totalSize;
        response['count']++;
    });

    const logPayload = response;
    const logObject = await createLogObject(functionInvocationID, functionInvocationTime, functionName, logPayload);
    const logBlob = await createLogBlob(logStorageAccount, logStorageKey, logStorageContainer, logObject);
    context.log(logBlob);

    const callbackMessage = await createCallbackMessage(logObject, 200);
    context.bindings.callbackMessage = JSON.stringify(callbackMessage);
    context.log(callbackMessage);

    const invocationEvent = await createEvent(functionInvocationID, functionInvocationTime, functionInvocationTimestamp, functionName, functionEventType, functionEventID, functionLogID, logStorageAccount, logStorageContainer, eventLabel, eventTags);
    context.bindings.flynnEvent = JSON.stringify(invocationEvent);
    context.log(invocationEvent);

    context.done(null, logBlob);

    async function parseMembers(members) {
        let createBlobResults = [];

        Object.getOwnPropertyNames(members).forEach(async function(group_slug) {
            let blobName = group_slug +'.json';
            let memberships = members[group_slug];
            let uniqueMemberships = new Set(memberships);
            let blobContent = JSON.stringify([...uniqueMemberships]);
            let result = await createBlob(
                blobStorageAccount,
                blobStorageKey,
                blobStorageContainer,
                blobName,
                blobContent
            );
            createBlobResults.push(result);
        });

        return createBlobResults;
    }

    async function calculateMembers (rows) {
        let members = {};

        legacySCSets.forEach(function(set) {
            members[set.id] = [];
        });

        rows.forEach(function(row) {
            if (row.EMAIL_ADDRESS
                && row.SCHOOL_CODE
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let ein = row.EMPLOYEE_ID;
                let email = row.EMAIL_ADDRESS;
                let username = row.USERNAME;
                let school_code = 'SC-' + row.SCHOOL_CODE;

                let person = {
                    ein: ein,
                    email: email,
                    username: username
                };

                legacySCSets.forEach(function(set) {
                    if (set.definition[0].includes(school_code)) {
                        members[set.id].push(person);
                    }
                });
            }
        });
        return members;
    }
};

export default membershipsLegacySCCalculate;
