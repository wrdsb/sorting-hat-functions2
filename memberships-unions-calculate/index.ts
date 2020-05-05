import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsUnionsCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.Unions.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-unions-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'set-memberships-now';

    const cama_group_codes = context.bindings.camaGroupCodes.definition[0];
    const cyw_job_codes = context.bindings.cywJobCodes.definition[0];
    const dece_group_codes = context.bindings.deceGroupCodes.definition[0];
    const dece_excluded_job_codes = context.bindings.deceExcludedJobCodes.definition[0];
    const dece_observer_job_codes = context.bindings.deceObserverJobCodes.definition[0];
    const eaa_group_codes = context.bindings.eaaGroupCodes.definition[0];
    const eaa_excluded_job_codes = context.bindings.eaaExcludedJobCodes.definition[0];
    const ess_group_codes = context.bindings.essGroupCodes.definition[0];
    const etfo_group_codes = context.bindings.etfoGroupCodes.definition[0];
    const osstf_contract_group_codes = context.bindings.osstfContractGroupCodes.definition[0];
    const osstf_ot_group_codes = context.bindings.osstfOtGroupCodes.definition[0];
    const pssp_group_codes = context.bindings.psspGroupCodes.definition[0];
    const smaca_group_codes = context.bindings.smacaGroupCodes.definition[0];
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
        members['cama-group-codes'] = [];
        members['cyw-job-codes'] = [];
        members['cyw-elementary-job-codes'] = [];
        members['cyw-secondary-job-codes'] = [];
        members['dece-group-codes'] = [];
        members['dece-observer-job-codes'] = [];
        members['eaa-group-codes'] = [];
        members['eaa-elementary-group-codes'] = [];
        members['eaa-secondary-group-codes'] = [];
        members['ess-group-codes'] = [];
        members['etfo-group-codes'] = [];
        members['osstf-contract-group-codes'] = [];
        members['osstf-ot-group-codes'] = [];
        members['pssp-group-codes'] = [];
        members['smaca-group-codes'] = [];
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
                let panel = row.PANEL;

                let person = {
                    ein: ein,
                    email: email,
                    username: username
                };

                if (cama_group_codes.includes(group_code)) {
                    members['cama-group-codes'].push(person);
                }

                if (cyw_job_codes.includes(job_code)) {
                    members['cyw-job-codes'].push(person);
                }

                if (cyw_job_codes.includes(job_code) && panel == 'E') {
                    members['cyw-elementary-job-codes'].push(person);
                }

                if (cyw_job_codes.includes(job_code) && panel == 'S') {
                    members['cyw-secondary-job-codes'].push(person);
                }
        
                if (dece_group_codes.includes(group_code) && !dece_excluded_job_codes.includes(job_code)) {
                    members['dece-group-codes'].push(person);
                }

                if (dece_observer_job_codes.includes(job_code)) {
                    members['dece-observer-job-codes'].push(person);
                }

                if (eaa_group_codes.includes(group_code) && !eaa_excluded_job_codes.includes(job_code)) {
                    members['eaa-group-codes'].push(person);
                    if (panel == 'E') {
                        members['eaa-elementary-group-codes'].push(person);
                    }
                    if (panel == 'S') {
                        members['eaa-secondary-group-codes'].push(person);
                    }
                }

                if (ess_group_codes.includes(group_code)) {
                    members['ess-group-codes'].push(person);
                }

                if (etfo_group_codes.includes(group_code)) {
                    members['etfo-group-codes'].push(person);
                }

                if (osstf_contract_group_codes.includes(group_code)) {
                    members['osstf-contract-group-codes'].push(person);
                }

                if (osstf_ot_group_codes.includes(group_code)) {
                    members['osstf-ot-group-codes'].push(person);
                }

                if (pssp_group_codes.includes(group_code)) {
                    members['pssp-group-codes'].push(person);
                }

                if (smaca_group_codes.includes(group_code)) {
                    members['smaca-group-codes'].push(person);
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
};

export default membershipsUnionsCalculate;
