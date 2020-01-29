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

    const elementary_admin_job_codes = context.bindings.elementaryAdminJobCodes.job_codes;
    const elementary_head_secretaries_job_codes = context.bindings.elementaryHeadSecretariesJobCodes.job_codes;
    const elementary_c_secretaries_job_codes = context.bindings.elementaryCSecretariesJobCodes.job_codes;
    const elementary_teachers_group_codes = context.bindings.elementaryTeachersGroupCodes.group_codes;
    const elementary_ot_teachers_job_codes = context.bindings.elementaryOtTeachersJobCodes.job_codes;
    const elementary_staffing_support_job_codes = context.bindings.elementaryStaffingSupportJobCodes.job_codes;
    
    const secondary_admin_job_codes = context.bindings.secondaryAdminJobCodes.job_codes;
    const secondary_office_supervisors_job_codes = context.bindings.secondaryOfficeSupervisorsJobCodes.job_codes;
    const secondary_office_assistants_job_codes = context.bindings.secondaryOfficeAssistantsJobCodes.job_codes;
    const secondary_c_secretaries_job_codes = context.bindings.secondaryCSecretariesJobCodes.job_codes;
    const secondary_teachers_group_codes = context.bindings.secondaryTeachersGroupCodes.group_codes;
    const secondary_ot_teachers_group_codes = context.bindings.secondaryOtTeachersGroupCodes.group_codes;

    //const secondary_staffing_support_job_codes = context.bindings.secondaryStaffingSupportJobCodes.job_codes;
    //const educational_assistants_job_codes = context.bindings.educationalAssistantsJobCodes.job_codes;

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
        let create_blob_results = [];
        Object.getOwnPropertyNames(members).forEach(async function(group_slug) {
            let blob_name = group_slug +'.json';
            let memberships = JSON.stringify(members[group_slug]);
            let result = await createBlob(blobStorageAccount, blobStorageKey, blobStorageContainer, blob_name, memberships);
            create_blob_results.push(result);
        });
        return create_blob_results;
    }

    async function calculateMembers (rows) {
        let members = {};

        rows.forEach(function(row) {
            if (row.EMAIL_ADDRESS
                && row.JOB_CODE
                && row.EMP_GROUP_CODE
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let email = row.EMAIL_ADDRESS;
                let job_code = row.JOB_CODE;
                let group_code = row.EMP_GROUP_CODE;

                if (elementary_admin_job_codes.includes(job_code)) {
                    if (!members['elementary-admin']) {
                        members['elementary-admin'] = {};
                    }
                    members['elementary-admin'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "elementary-admin@wrdsb.ca"
                    };
                }
                
                if (elementary_head_secretaries_job_codes.includes(job_code)) {
                    if (!members['elementary-head-secretaries']) {
                        members['elementary-head-secretaries'] = {};
                    }
                    members['elementary-head-secretaries'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "elementary-head-secretaries@wrdsb.ca"
                    };
                }
                
                if (elementary_c_secretaries_job_codes.includes(job_code)) {
                    if (!members['elementary-c-secretaries']) {
                        members['elementary-c-secretaries'] = {};
                    }
                    members['elementary-c-secretaries'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "elementary-c-secretaries@wrdsb.ca"
                    };
                }
                
                if (elementary_teachers_group_codes.includes(group_code)) {
                    if (!members['elementary-teachers']) {
                        members['elementary-teachers'] = {};
                    }
                    members['elementary-teachers'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "elementary-teachers@wrdsb.ca"
                    };
                }
                
                if (elementary_ot_teachers_job_codes.includes(job_code)) {
                    if (!members['elementary-ot-teachers']) {
                        members['elementary-ot-teachers'] = {};
                    }
                    members['elementary-ot-teachers'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "elementary-ot-teachers@wrdsb.ca"
                    };
                }
                
                if (elementary_staffing_support_job_codes.includes(job_code)) {
                    if (!members['elementary-staffing-support']) {
                        members['elementary-staffing-support'] = {};
                    }
                    members['elementary-staffing-support'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'elementary-staffing-support@wrdsb.ca'
                    };
                }
                
                if (secondary_admin_job_codes.includes(job_code)) {
                    if (!members['secondary-admin']) {
                        members['secondary-admin'] = {};
                    }
                    members['secondary-admin'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-admin@wrdsb.ca"
                    };
                }
                
                if (secondary_office_supervisors_job_codes.includes(job_code)) {
                    if (!members['secondary-office-supervisors']) {
                        members['secondary-office-supervisors'] = {};
                    }
                    members['secondary-office-supervisors'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-office-supervisors@wrdsb.ca"
                    };
                }
                
                if (secondary_office_assistants_job_codes.includes(job_code)) {
                    if (!members['secondary-office-assistants']) {
                        members['secondary-office-assistants'] = {};
                    }
                    members['secondary-office-assistants'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-office-assistants@wrdsb.ca"
                    };
                }
                
                if (secondary_c_secretaries_job_codes.includes(job_code)) {
                    if (!members['secondary-c-secretaries']) {
                        members['secondary-c-secretaries'] = {};
                    }
                    members['secondary-c-secretaries'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-c-secretaries@wrdsb.ca"
                    };
                }
                
                if (secondary_teachers_group_codes.includes(group_code)) {
                    if (!members['secondary-teachers']) {
                        members['secondary-teachers'] = {};
                    }
                    members['secondary-teachers'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-teachers@wrdsb.ca"
                    };
                }
                
                if (secondary_ot_teachers_group_codes.includes(group_code)) {
                    if (!members['secondary-ot-teachers']) {
                        members['secondary-ot-teachers'] = {};
                    }
                    members['secondary-ot-teachers'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       "secondary-ot-teachers@wrdsb.ca"
                    };
                }

                //if (educational_assistants_job_codes.includes(job_code)) {
                    //if (!members['educational-assistants']) {
                        //members['educational-assistants'] = {};
                    //}
                    //members['educational-assistants'][email] = {
                        //email:          email,
                        //role:           "MEMBER",
                        //status:         "ACTIVE",
                        //type:           "USER",
                        //groupKey:       "educational-assistants@wrdsb.ca"
                    //};
                //}
            }
        });
        return members;
    }
};

export default membershipsRolesCalculate;
