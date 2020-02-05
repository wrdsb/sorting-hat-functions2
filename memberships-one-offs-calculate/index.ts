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

    const admissions_qna_job_codes = context.bindings.admissionsQnaJobCodes.definition;
    const dece_staff_group_codes = context.bindings.deceStaffGroupCodes.definition;
    const ea_staff_job_codes = context.bindings.eaStaffJobCodes.definition;
    const ed_deployment_manager_job_codes = context.bindings.edDeploymentManagerJobCodes.definition;
    const ed_deployment_member_job_codes = context.bindings.edDeploymentMemberJobCodes.definition;
    const ed_inquiries_job_codes = context.bindings.edInquiriesJobCodes.definition;
    const edc_location_codes = context.bindings.edcLocationCodes.definition;
    const elementary_serts_job_codes = context.bindings.elementarySertsJobCodes.definition;
    const finance_job_codes = context.bindings.financeJobCodes.definition;
    const finance_location_codes = context.bindings.financeLocationCodes.definition;
    const grc_health_safety_location_codes = context.bindings.grcHealthSafetyLocationCodes.definition;
    const itinerant_spec_ed_job_codes = context.bindings.itinerantSpecEdJobCodes.definition;
    const itinerant_spec_ed_location_codes = context.bindings.itinerantSpecEdLocationCodes.definition;
    const its_job_codes = context.bindings.itsJobCodes.definition;
    const its_location_codes = context.bindings.itsLocationCodes.definition;
    const its_managers_job_codes = context.bindings.itsManagersJobCodes.definition;
    const procurement_qna_job_codes = context.bindings.procurementQnaJobCodes.definition;
    const psychologists_job_codes = context.bindings.psychologistsJobCodes.definition;
    const risk_job_codes = context.bindings.riskJobCodes.definition;
    const school_day_job_codes = context.bindings.schoolDayJobCodes.definition;
    const secondary_serts_job_codes = context.bindings.secondarySertsJobCodes.definition;
    const smaca_elementary_group_codes = context.bindings.smacaElementaryGroupCodes.definition;
    const smaca_secondary_group_codes = context.bindings.smacaSecondaryGroupCodes.definition;
    const social_workers_job_codes = context.bindings.socialWorkersJobCodes.definition;
    const special_education_location_codes = context.bindings.specialEducationLocationCodes.definition;
    const special_education_consultants_job_codes = context.bindings.specialEducationConsultantsJobCodes.definition;
    const speech_language_job_codes = context.bindings.speechLanguageJobCodes.definition;
    const system_leaders_job_codes = context.bindings.systemLeadersJobCodes.definition;
    const thr_message_board_job_codes = context.bindings.thrMessageBoardJobCodes.definition;
    const twea_job_codes = context.bindings.tweaJobCodes.definition;
    const wrdsb_managers_job_codes = context.bindings.wrdsbManagersJobCodes.definition;
    const intranet_library_job_codes = context.bindings.intranetLibraryJobCodes.definition;
    const intranet_trillium_job_codes = context.bindings.intranetTrilliumJobCodes.definition;

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
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let email = row.EMAIL_ADDRESS;
                let job_code = 'JC-' + row.JOB_CODE;
                let group_code = 'GC-' + row.EMP_GROUP_CODE;
                let location_code = 'LC-' + row.LOCATION_CODE;
                let panel = row.PANEL;
                let activity_code = row.ACTIVITY_CODE;

                if (admissions_qna_job_codes.includes(job_code)) {
                    members['admissions-qna-job-codes'].push(email);
                }
                if (dece_staff_group_codes.includes(group_code)) {
                    members['dece-staff-group-codes'].push(email);
                }
                if (ea_staff_job_codes.includes(job_code)) {
                    members['ea-staff-job-codes'].push(email);
                }
                if (ed_deployment_manager_job_codes.includes(job_code)) {
                    members['ed-deployment-manager-job-codes'].push(email);
                }
                if (ed_deployment_member_job_codes.includes(job_code)) {
                    members['ed-deployment-member-job-codes'].push(email);
                }
                if (ed_inquiries_job_codes.includes(job_code)) {
                    members['ed-inquiries-job-codes'].push(email);
                }
                if (edc_location_codes.includes(location_code)) {
                    members['edc-location-codes'].push(email);
                }
                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(email);
                }
                if (finance_job_codes.includes(job_code)) {
                    members['finance-job-codes'].push(email);
                }
                if (finance_location_codes.includes(location_code)) {
                    members['finance-location-codes'].push(email);
                }
                if (grc_health_safety_location_codes.includes(location_code)) {
                    members['grc-health-safety-location-codes'].push(email);
                }
                if (intranet_library_job_codes.includes(job_code)) {
                    members['intranet-library-job-codes'].push(email);
                }
                if (elementary_serts_job_codes.includes(job_code) && panel == 'E') {
                    members['elementary-serts-job-codes'].push(email);
                }
                if (secondary_serts_job_codes.includes(job_code) && panel == 'S') {
                    members['secondary-serts-job-codes'].push(email);
                }
                if (special_education_consultants_job_codes.includes(job_code)) {
                    members['special-education-consultants-job-codes'].push(email);
                }
                if (intranet_trillium_job_codes.includes(job_code)) {
                    members['intranet-trillium-job-codes'].push(email);
                }
                if (itinerant_spec_ed_job_codes.includes(job_code) && itinerant_spec_ed_location_codes.includes(location_code)) {
                    members['itinerant-spec-ed-job-codes'].push(email);
                }
                if (its_job_codes.includes(job_code)) {
                    members['its-job-codes'].push(email);
                }
                if (its_location_codes.includes(location_code)) {
                    members['its-location-codes'].push(email);
                }
                if (its_managers_job_codes.includes(job_code)) {
                    members['its-managers-job-codes'].push(email);
                }
                if (procurement_qna_job_codes.includes(job_code)) {
                    members['procurement-qna-job-codes'].push(email);
                }
                if (psychologists_job_codes.includes(job_code)) {
                    members['psychologists-job-codes'].push(email);
                }
                if (risk_job_codes.includes(job_code)) {
                    members['risk-job-codes'].push(email);
                }
                if (school_day_job_codes.includes(job_code)) {
                    members['school-day-job-codes'].push(email);
                }
                if (secondary_serts_job_codes.includes(job_code) && panel == 'S') {
                    members['secondary-serts-job-codes'].push(email);
                }
                if (smaca_elementary_group_codes.includes(group_code) && panel == 'E') {
                    members['smaca-elementary-group-codes'].push(email);
                }
                if (smaca_secondary_group_codes.includes(group_code) && panel == 'S') {
                    members['smaca-secondary-group-codes'].push(email);
                }
                if (social_workers_job_codes.includes(job_code)) {
                    members['social-workers-job-codes'].push(email);
                }
                if (special_education_location_codes.includes(location_code)) {
                    members['special-education-location-codes'].push(email);
                }
                if (special_education_consultants_job_codes.includes(job_code)) {
                    members['special-education-consultants-job-codes'].push(email);
                }
                if (speech_language_job_codes.includes(job_code)) {
                    members['speech-language-job-codes'].push(email);
                }
                if (system_leaders_job_codes.includes(job_code)) {
                    members['system-leaders-job-codes'].push(email);
                }
                if (thr_message_board_job_codes.includes(job_code)) {
                    members['thr-message-board-job-codes'].push(email);
                }
                if (twea_job_codes.includes(job_code)) {
                    members['twea-job-codes'].push(email);
                }
                if (wrdsb_managers_job_codes.includes(job_code)) {
                    members['wrdsb-managers-job-codes'].push(email);
                }
            }
        });
        return members;
    }
}

export default membershipsOneOffsCalculate;
