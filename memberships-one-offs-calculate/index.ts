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

    const admissions_qna_job_codes = context.bindings.admissionsQnaJobCodes.definition[0];
    const dece_staff_group_codes = context.bindings.deceStaffGroupCodes.definition[0];
    const ea_staff_job_codes = context.bindings.eaStaffJobCodes.definition[0];
    const ed_deployment_manager_job_codes = context.bindings.edDeploymentManagerJobCodes.definition[0];
    const ed_deployment_member_job_codes = context.bindings.edDeploymentMemberJobCodes.definition[0];
    const ed_inquiries_job_codes = context.bindings.edInquiriesJobCodes.definition[0];
    const edc_location_codes = context.bindings.edcLocationCodes.definition[0];
    const elementary_serts_job_codes = context.bindings.elementarySertsJobCodes.definition[0];
    const finance_job_codes = context.bindings.financeJobCodes.definition[0];
    const finance_location_codes = context.bindings.financeLocationCodes.definition[0];
    const grc_health_safety_location_codes = context.bindings.grcHealthSafetyLocationCodes.definition[0];
    const itinerant_spec_ed_job_codes = context.bindings.itinerantSpecEdJobCodes.definition[0];
    const itinerant_spec_ed_location_codes = context.bindings.itinerantSpecEdLocationCodes.definition[0];
    const its_job_codes = context.bindings.itsJobCodes.definition[0];
    const its_location_codes = context.bindings.itsLocationCodes.definition[0];
    const its_managers_job_codes = context.bindings.itsManagersJobCodes.definition[0];
    const procurement_qna_job_codes = context.bindings.procurementQnaJobCodes.definition[0];
    const psychologists_job_codes = context.bindings.psychologistsJobCodes.definition[0];
    const risk_job_codes = context.bindings.riskJobCodes.definition[0];
    const school_day_job_codes = context.bindings.schoolDayJobCodes.definition[0];
    const secondary_serts_job_codes = context.bindings.secondarySertsJobCodes.definition[0];
    const smaca_elementary_group_codes = context.bindings.smacaElementaryGroupCodes.definition[0];
    const smaca_secondary_group_codes = context.bindings.smacaSecondaryGroupCodes.definition[0];
    const social_workers_job_codes = context.bindings.socialWorkersJobCodes.definition[0];
    const special_education_location_codes = context.bindings.specialEducationLocationCodes.definition[0];
    const special_education_consultants_job_codes = context.bindings.specialEducationConsultantsJobCodes.definition[0];
    const speech_language_job_codes = context.bindings.speechLanguageJobCodes.definition[0];
    const system_leaders_job_codes = context.bindings.systemLeadersJobCodes.definition[0];
    const thr_message_board_job_codes = context.bindings.thrMessageBoardJobCodes.definition[0];
    const twea_job_codes = context.bindings.tweaJobCodes.definition[0];
    const wrdsb_managers_job_codes = context.bindings.wrdsbManagersJobCodes.definition[0];
    const intranet_library_job_codes = context.bindings.intranetLibraryJobCodes.definition[0];
    const intranet_trillium_job_codes = context.bindings.intranetTrilliumJobCodes.definition[0];

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
        members['admissions-qna-job-codes'] = [];
        members['dece-staff-group-codes'] = [];
        members['ea-staff-job-codes'] = [];
        members['ed-deployment-manager-job-codes'] = [];
        members['ed-deployment-member-job-codes'] = [];
        members['ed-inquiries-job-codes'] = [];
        members['edc-location-codes'] = [];
        members['elementary-serts-job-codes'] = [];
        members['finance-job-codes'] = [];
        members['finance-location-codes'] = [];
        members['grc-health-safety-location-codes'] = [];
        members['intranet-library-job-codes'] = [];
        members['elementary-serts-job-codes'] = [];
        members['secondary-serts-job-codes'] = [];
        members['special-education-consultants-job-codes'] = [];
        members['intranet-trillium-job-codes'] = [];
        members['itinerant-spec-ed-job-codes'] = [];
        members['its-job-codes'] = [];
        members['its-location-codes'] = [];
        members['its-managers-job-codes'] = [];
        members['procurement-qna-job-codes'] = [];
        members['psychologists-job-codes'] = [];
        members['risk-job-codes'] = [];
        members['school-day-job-codes'] = [];
        members['secondary-serts-job-codes'] = [];
        members['smaca-elementary-group-codes'] = [];
        members['smaca-secondary-group-codes'] = [];
        members['social-workers-job-codes'] = [];
        members['special-education-location-codes'] = [];
        members['special-education-consultants-job-codes'] = [];
        members['speech-language-job-codes'] = [];
        members['system-leaders-job-codes'] = [];
        members['thr-message-board-job-codes'] = [];
        members['twea-job-codes'] = [];
        members['wrdsb-managers-job-codes'] = [];

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

                if (admissions_qna_job_codes.includes(job_code)) {
                    members['admissions-qna-job-codes'].push(person);
                }
                if (dece_staff_group_codes.includes(group_code)) {
                    members['dece-staff-group-codes'].push(person);
                }
                if (ea_staff_job_codes.includes(job_code)) {
                    members['ea-staff-job-codes'].push(person);
                }
                if (ed_deployment_manager_job_codes.includes(job_code)) {
                    members['ed-deployment-manager-job-codes'].push(person);
                }
                if (ed_deployment_member_job_codes.includes(job_code)) {
                    members['ed-deployment-member-job-codes'].push(person);
                }
                if (ed_inquiries_job_codes.includes(job_code)) {
                    members['ed-inquiries-job-codes'].push(person);
                }
                if (edc_location_codes.includes(location_code)) {
                    members['edc-location-codes'].push(person);
                }
                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(person);
                }
                if (finance_job_codes.includes(job_code)) {
                    members['finance-job-codes'].push(person);
                }
                if (finance_location_codes.includes(location_code)) {
                    members['finance-location-codes'].push(person);
                }
                if (grc_health_safety_location_codes.includes(location_code)) {
                    members['grc-health-safety-location-codes'].push(person);
                }
                if (intranet_library_job_codes.includes(job_code)) {
                    members['intranet-library-job-codes'].push(person);
                }
                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(person);
                }
                if (secondary_serts_job_codes.includes(job_code) && panel == 'S') {
                    members['secondary-serts-job-codes'].push(person);
                }
                if (special_education_consultants_job_codes.includes(job_code)) {
                    members['special-education-consultants-job-codes'].push(person);
                }
                if (intranet_trillium_job_codes.includes(job_code)) {
                    members['intranet-trillium-job-codes'].push(person);
                }
                if (itinerant_spec_ed_job_codes.includes(job_code) && itinerant_spec_ed_location_codes.includes(location_code)) {
                    members['itinerant-spec-ed-job-codes'].push(person);
                }
                if (its_job_codes.includes(job_code)) {
                    members['its-job-codes'].push(person);
                }
                if (its_location_codes.includes(location_code)) {
                    members['its-location-codes'].push(person);
                }
                if (its_managers_job_codes.includes(job_code)) {
                    members['its-managers-job-codes'].push(person);
                }
                if (procurement_qna_job_codes.includes(job_code)) {
                    members['procurement-qna-job-codes'].push(person);
                }
                if (psychologists_job_codes.includes(job_code)) {
                    members['psychologists-job-codes'].push(person);
                }
                if (risk_job_codes.includes(job_code)) {
                    members['risk-job-codes'].push(person);
                }
                if (school_day_job_codes.includes(job_code)) {
                    members['school-day-job-codes'].push(person);
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
                if (social_workers_job_codes.includes(job_code)) {
                    members['social-workers-job-codes'].push(person);
                }
                if (special_education_location_codes.includes(location_code)) {
                    members['special-education-location-codes'].push(person);
                }
                if (special_education_consultants_job_codes.includes(job_code)) {
                    members['special-education-consultants-job-codes'].push(person);
                }
                if (speech_language_job_codes.includes(job_code)) {
                    members['speech-language-job-codes'].push(person);
                }
                if (system_leaders_job_codes.includes(job_code)) {
                    members['system-leaders-job-codes'].push(person);
                }
                if (thr_message_board_job_codes.includes(job_code)) {
                    members['thr-message-board-job-codes'].push(person);
                }
                if (twea_job_codes.includes(job_code)) {
                    members['twea-job-codes'].push(person);
                }
                if (wrdsb_managers_job_codes.includes(job_code)) {
                    members['wrdsb-managers-job-codes'].push(person);
                }
            }
        });
        return members;
    }
}

export default membershipsOneOffsCalculate;
