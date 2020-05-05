import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsOneOffsCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.OneOffs.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-one-offs-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'set-memberships-now';

    const elementary_serts_job_codes = context.bindings.elementarySertsJobCodes.definition[0];
    const itinerant_spec_ed_job_codes = context.bindings.itinerantSpecEdJobCodes.definition[0];
    const itinerant_spec_ed_location_codes = context.bindings.itinerantSpecEdLocationCodes.definition[0];
    const secondary_serts_job_codes = context.bindings.secondarySertsJobCodes.definition[0];
    const smaca_elementary_group_codes = context.bindings.smacaElementaryGroupCodes.definition[0];
    const smaca_secondary_group_codes = context.bindings.smacaSecondaryGroupCodes.definition[0];

    const rows = context.bindings.iamwpRaw;

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
        members['elementary-serts-job-codes'] = [];
        members['intranet-trillium-job-codes'] = [];
        members['itinerant-spec-ed-job-codes'] = [];
        members['secondary-serts-job-codes'] = [];
        members['smaca-elementary-group-codes'] = [];
        members['smaca-secondary-group-codes'] = [];

        rows.forEach(function(row) {
            if (row.EMAIL_ADDRESS
                && row.JOB_CODE
                && row.EMP_GROUP_CODE
                && row.LOCATION_CODE
                && row.PANEL
                && row.SCHOOL_CODE
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let ein = row.EMPLOYEE_ID;
                let email = row.EMAIL_ADDRESS;
                let username = row.USERNAME;
                let job_code = 'JC-' + row.JOB_CODE;
                let group_code = 'GC-' + row.EMP_GROUP_CODE;
                let location_code = 'LC-' + row.LOCATION_CODE;
                let panel = row.PANEL;
                let activity_code = row.ACTIVITY_CODE;

                let person = {
                    ein: ein,
                    email: email,
                    username: username
                };

                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(person);
                }
                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(person);
                }
                if (secondary_serts_job_codes.includes(job_code) && panel == 'S') {
                    members['secondary-serts-job-codes'].push(person);
                }
                if (itinerant_spec_ed_job_codes.includes(job_code) && itinerant_spec_ed_location_codes.includes(location_code)) {
                    members['itinerant-spec-ed-job-codes'].push(person);
                }
                if (secondary_serts_job_codes.includes(job_code) && panel == 'S') {
                    members['secondary-serts-job-codes'].push(person);
                }
                if (smaca_elementary_group_codes.includes(group_code) && panel == 'E') {
                    members['smaca-elementary-group-codes'].push(person);
                }
                if (smaca_secondary_group_codes.includes(group_code) && panel == 'S') {
                    members['smaca-secondary-group-codes'].push(person);
                }
            }
        });
        return members;
    }
}

export default membershipsOneOffsCalculate;
