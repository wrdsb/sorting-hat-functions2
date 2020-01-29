import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../SharedCode/createLogObject";
import { createLogBlob } from "../SharedCode/createLogBlob";
import { createCallbackMessage } from "../SharedCode/createCallbackMessage";
import { createEvent } from "../SharedCode/createEvent";
import { createBlob } from "../SharedCode/createBlob";

const membershipsABCCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.ABC.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-abc-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'set-memberships-now';

    const admin_job_codes = context.bindings.abcAdminJobCodes.definition;
    const attendance_job_codes = context.bindings.abcAttendanceJobCodes.definition;
    const beforeafter_job_codes = context.bindings.abcBeforeafterJobCodes.definition;
    const courier_job_codes = context.bindings.abcCourierJobCodes.definition;
    const easyconnect_job_codes = context.bindings.abcEasyconnectJobCodes.definition;
    const its_job_codes = context.bindings.abcItsJobCodes.definition;
    const office_job_codes = context.bindings.abcOfficeJobCodes.definition;
    const orders_job_codes = context.bindings.abcOrdersJobCodes.definition;
    const s4s_job_codes = context.bindings.abcS4sJobCodes.definition;

    const rows = context.bindings.iamwpRaw;

    const triggerJSON = JSON.parse(triggerMessage);
    const requested_school_code = triggerJSON.school_code.toLowerCase();

    const excluded_job_codes = ['6106', '6118'];
    const activity_codes = ['ACTIVE', 'ONLEAVE'];

    let calculated_members = await calculateMembers(rows);
    let staff_blob_results = await parseStaffMembers(calculated_members);

    let response = {};
    response['count'] = 0;
    
    staff_blob_results.forEach(function(blob) {
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

    async function parseStaffMembers(members) {
        let create_blob_results = [];

        Object.getOwnPropertyNames(members).forEach(async function (group_slug) {
            let blob_name = requested_school_code +'-'+ group_slug +'.json';
            let memberships = JSON.stringify(members[group_slug]);
            let result = await createBlob(blobStorageAccount, blobStorageKey, blobStorageContainer, blob_name, memberships);
            create_blob_results.push(result);
        });

        return create_blob_results;
    }

    async function calculateMembers (rows) {
        let members = [];
        members['staff'] = [];
        members['admin-job-codes'] = [];
        members['attendance-job-codes'] = [];
        members['beforeafter-job-codes'] = [];
        members['courier-job-codes'] = [];
        members['easyconnect-job-codes'] = [];
        members['its-job-codes'] = [];
        members['office-job-codes'] = [];
        members['orders-job-codes'] = [];
        members['s4s-job-codes'] = [];
    
        rows.forEach(function(row) {
            if (row.EMAIL_ADDRESS
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
                && row.JOB_CODE
                && row.SCHOOL_CODE
                && isNaN(row.SCHOOL_CODE)
                && requested_school_code == row.SCHOOL_CODE.toLowerCase()
            ) {
                let email = row.EMAIL_ADDRESS;
                let job_code = 'JC-' + row.JOB_CODE;
                let school_code = 'SC-' + row.SCHOOL_CODE.toLowerCase();

                if (row.EMP_GROUP_CODE) {
                    let group_code = 'GC-' + row.EMP_GROUP_CODE;
                }
                if (row.LOCATION_CODE) {
                    let location_code = 'LC-' + row.LOCATION_CODE;
                }
                if (row.PANEL) {
                    let panel = row.PANEL;
                }
                if (row.ACTIVITY_CODE) {
                    let activity_code = row.ACTIVITY_CODE;
                }

                members['staff'].push(email);

                if (admin_job_codes.includes(job_code)) {
                    members['admin-job-codes'].push(email);
                }

                if (attendance_job_codes.includes(job_code)) {
                    members['attendance-job-codes'].push(email);
                }
            
                if (beforeafter_job_codes.includes(job_code)) {
                    members['beforeafter-job-codes'].push(email);
                }
            
                if (courier_job_codes.includes(job_code)) {
                    members['courier-job-codes'].push(email);
                }
            
                if (easyconnect_job_codes.includes(job_code)) {
                    members['easyconnect-job-codes'].push(email);
                }
            
                if (its_job_codes.includes(job_code)) {
                    members['its-job-codes'].push(email);
                }
            
                if (office_job_codes.includes(job_code)) {
                    members['office-job-codes'].push(email);
                }
            
                if (orders_job_codes.includes(job_code)) {
                    members['orders-job-codes'].push(email);
                }
            
                if (s4s_job_codes.includes(job_code)) {
                    members['s4s-job-codes'].push(email);
                }
            }
        });
        return [members];
    }
};

export default membershipsABCCalculate;
