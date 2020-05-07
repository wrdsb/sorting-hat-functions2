import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsLegacyCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.Legacy.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-legacy-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const rows = context.bindings.iamwpRaw;
    const legacySetDefinition = context.bindings.legacySetDefinition;

    const excluded_job_codes = ['6106', '6118'];
    const activity_codes = ['ACTIVE', 'ONLEAVE'];

    let membersByEmail = {};
    let membersByEIN = {};
    let membersByUsername = {};

    let membersByEmailArray = [];
    let membersByEINArray = [];
    let membersByUsernameArray = [];

    rows.forEach(function(row) {
        if ( !excluded_job_codes.includes(row.JOB_CODE) && activity_codes.includes(row.ACTIVITY_CODE)) {

            let ein = (row.EMPLOYEE_ID) ? row.EMPLOYEE_ID : '';
            let email = (row.EMAIL_ADDRESS) ? row.EMAIL_ADDRESS : '';
            let username = (row.USERNAME) ? row.USERNAME.toLowerCase() : '';

            let person = {
                ein: ein,
                email: email,
                username: username
            };

            let job_code = (row.JOB_CODE) ? 'JC-' + row.JOB_CODE : '';
            let group_code = (row.EMP_GROUP_CODE) ? 'GC-' + row.EMP_GROUP_CODE : '';
            let location_code = (row.LOCATION_CODE) ? 'LC-' + row.LOCATION_CODE : '';
            let school_code = (row.SCHOOL_CODE) ? 'SC-' + row.SCHOOL_CODE : '';
            let panel = (row.PANEL) ? 'PANEL-' + row.PANEL : 'PANEL-X';

            let qualifications = [job_code, group_code, location_code, school_code, panel];
            let qualifies = [];

            legacySetDefinition.definition.forEach(function(criteria) {  // foreach array of criteria in the definition

                let check = criteria.some(function(criterion) {          //   look at each criterion on the array
                    if (criterion.charAt(0) === '!' ) {                  //     if the criterion is an exclusion
                        return !qualifications.includes(criterion.substr(1));
                    } else {                                             //     if the criterion is an inclusion
                        return qualifications.includes(criterion);                     
                    }
                });
                
                qualifies.push(check);
            });

            let qualified = qualifies.every(v => v === true);

            if (qualified) {
                membersByEmail[email] = person;
                membersByEIN[ein] = person;
                membersByUsername[username] = person;
            }
        }
    });

    Object.getOwnPropertyNames(membersByEmail).forEach(function (email) {
        membersByEmailArray.push(membersByEmail[email]);
    })
    Object.getOwnPropertyNames(membersByEIN).forEach(function (ein) {
        membersByEINArray.push(membersByEIN[ein]);
    })
    Object.getOwnPropertyNames(membersByUsername).forEach(function (username) {
        membersByUsernameArray.push(membersByUsername[username]);
    })

    context.bindings.setMembershipsByEmailObject = JSON.stringify(membersByEmail);
    context.bindings.setMembershipsByEmailArray = JSON.stringify(membersByEmailArray);

    context.bindings.setMembershipsByEINObject = JSON.stringify(membersByEIN);
    context.bindings.setMembershipsByEINArray = JSON.stringify(membersByEINArray);

    context.bindings.setMembershipsByUsernameObject = JSON.stringify(membersByUsername);
    context.bindings.setMembershipsByUsernameArray = JSON.stringify(membersByUsernameArray);

    const logPayload = membersByEmail;
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
};

export default membershipsLegacyCalculate;
