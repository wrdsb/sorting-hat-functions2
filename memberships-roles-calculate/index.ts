import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsRolesCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.Roles.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-roles-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'set-memberships-now';

    const elementary_admin_job_codes = context.bindings.elementaryAdminJobCodes.definition[0];
    const elementary_head_secretaries_job_codes = context.bindings.elementaryHeadSecretariesJobCodes.definition[0];
    const elementary_c_secretaries_job_codes = context.bindings.elementaryCSecretariesJobCodes.definition[0];
    const elementary_teachers_group_codes = context.bindings.elementaryTeachersGroupCodes.definition[0];
    const elementary_ot_teachers_job_codes = context.bindings.elementaryOtTeachersJobCodes.definition[0];
    const elementary_staffing_support_job_codes = context.bindings.elementaryStaffingSupportJobCodes.definition[0];
    const secondary_admin_job_codes = context.bindings.secondaryAdminJobCodes.definition[0];
    const secondary_office_supervisors_job_codes = context.bindings.secondaryOfficeSupervisorsJobCodes.definition[0];
    const secondary_office_assistants_job_codes = context.bindings.secondaryOfficeAssistantsJobCodes.definition[0];
    const secondary_c_secretaries_job_codes = context.bindings.secondaryCSecretariesJobCodes.definition[0];
    const secondary_teachers_group_codes = context.bindings.secondaryTeachersGroupCodes.definition[0];
    const secondary_ot_teachers_group_codes = context.bindings.secondaryOtTeachersGroupCodes.definition[0];

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
        members['elementary-admin-job-codes'] = [];
        members['elementary-head-secretaries-job-codes'] = [];
        members['elementary-c-secretaries-job-codes'] = [];
        members['elementary-teachers-group-codes'] = [];
        members['elementary-ot-teachers-job-codes'] = [];
        members['elementary-staffing-support-job-codes'] = [];
        members['secondary-admin-job-codes'] = [];
        members['secondary-office-supervisors-job-codes'] = [];
        members['secondary-office-assistants-job-codes'] = [];
        members['secondary-c-secretaries-job-codes'] = [];
        members['secondary-teachers-group-codes'] = [];
        members['secondary-ot-teachers-group-codes'] = [];

        rows.forEach(function(row) {
            if (row.EMAIL_ADDRESS
                && row.JOB_CODE
                && row.EMP_GROUP_CODE
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let ein = row.EMPLOYEE_ID;
                let email = row.EMAIL_ADDRESS;
                let username = row.USERNAME;
                let job_code = 'JC-' + row.JOB_CODE;
                let group_code = 'GC-' + row.EMP_GROUP_CODE;

                let person = {
                    ein: ein,
                    email: email,
                    username: username
                };

                if (elementary_admin_job_codes.includes(job_code)) {
                    members['elementary-admin-job-codes'].push(person);
                }
                
                if (elementary_head_secretaries_job_codes.includes(job_code)) {
                    members['elementary-head-secretaries-job-codes'].push(person);
                }
                
                if (elementary_c_secretaries_job_codes.includes(job_code)) {
                    members['elementary-c-secretaries-job-codes'].push(person);
                }
                
                if (elementary_teachers_group_codes.includes(group_code)) {
                    members['elementary-teachers-group-codes'].push(person);
                }
                
                if (elementary_ot_teachers_job_codes.includes(job_code)) {
                    members['elementary-ot-teachers-job-codes'].push(person);
                }
                
                if (elementary_staffing_support_job_codes.includes(job_code)) {
                    members['elementary-staffing-support-job-codes'].push(person);
                }
                
                if (secondary_admin_job_codes.includes(job_code)) {
                    members['secondary-admin-job-codes'].push(person);
                }
                
                if (secondary_office_supervisors_job_codes.includes(job_code)) {
                    members['secondary-office-supervisors-job-codes'].push(person);
                }
                
                if (secondary_office_assistants_job_codes.includes(job_code)) {
                    members['secondary-office-assistants-job-codes'].push(person);
                }
                
                if (secondary_c_secretaries_job_codes.includes(job_code)) {
                    members['secondary-c-secretaries-job-codes'].push(person);
                }
                
                if (secondary_teachers_group_codes.includes(group_code)) {
                    members['secondary-teachers-group-codes'].push(person);
                }
                
                if (secondary_ot_teachers_group_codes.includes(group_code)) {
                    members['secondary-ot-teachers-group-codes'].push(person);
                }
            }
        });
        return members;
    }
};

export default membershipsRolesCalculate;
