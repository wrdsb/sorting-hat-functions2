import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../shared/createLogObject";
import { createLogBlob } from "../shared/createLogBlob";
import { createCallbackMessage } from "../shared/createCallbackMessage";
import { createEvent } from "../shared/createEvent";
import { createBlob } from "../shared/createBlob";

const membershipsStudentsCalculate: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    const functionInvocationID = context.executionContext.invocationId;
    const functionInvocationTime = new Date();
    const functionInvocationTimestamp = functionInvocationTime.toJSON();  // format: 2012-04-23T18:25:43.511Z

    const functionName = context.executionContext.functionName;
    const functionEventType = 'WRDSB.SortingHat.Memberships.Students.Calculate';
    const functionEventID = `sorting-hat-functions-${functionName}-${functionInvocationID}`;
    const functionLogID = `${functionInvocationTime.getTime()}-${functionInvocationID}`;

    const logStorageAccount = process.env['storageAccount'];
    const logStorageKey = process.env['storageKey'];
    const logStorageContainer = 'function-memberships-students-calculate-logs';

    const eventLabel = '';
    const eventTags = [
        "sorting-hat", 
    ];

    const blobStorageAccount = process.env['storageAccount'];
    const blobStorageKey = process.env['storageKey'];
    const blobStorageContainer = 'set-memberships-now';

    const students = context.bindings.studentsNow;

    let calculated_members = await calculateMembers(students);
    let membership_blob_results = await parseMembers(calculated_members);

    let response = {};
    response['count'] = 0;
    
    membership_blob_results.forEach(function(blob) {
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

        Object.getOwnPropertyNames(members).forEach(async function (group_slug) {
            let blob_name = group_slug + '-students.json';
            let memberships = JSON.stringify(members[group_slug]);
            let result = await createBlob(blobStorageAccount, blobStorageKey, blobStorageContainer, blob_name, memberships);
            create_blob_results.push(result);
        });

        return create_blob_results;
    }

    async function calculateMembers (students) {
        let members = {};

        students.forEach(function(student) {
            if (student.student_email) {
                let email = (student.student_email) ? student.student_email : '';
                let school_code = (student.school_code) ? student.school_code.toLowerCase() : '';
                let oyap = (student.student_oyap === 'Y') ? true : false;

                if (!members[school_code]) {
                    members[school_code] = {};
                }
                if (!members['oyap']) {
                    members['oyap'] = {};
                }

                members[school_code][email] = {
                    email:          email,
                    role:           "MEMBER",
                    status:         "ACTIVE",
                    type:           "USER",
                    groupKey:       school_code + '-students@wrdsb.ca'
                };
        
                if (oyap) {
                    members['oyap'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'oyap-students@wrdsb.ca'
                    };
                }
            }
        });
        return members;
    }
};

export default membershipsStudentsCalculate;
