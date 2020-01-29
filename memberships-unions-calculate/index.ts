import { AzureFunction, Context } from "@azure/functions"
import { createLogObject } from "../SharedCode/createLogObject";
import { createLogBlob } from "../SharedCode/createLogBlob";
import { createCallbackMessage } from "../SharedCode/createCallbackMessage";
import { createEvent } from "../SharedCode/createEvent";
import { createBlob } from "../SharedCode/createBlob";

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

    const cama_group_codes = context.bindings.camaGroupCodes.group_codes;
    const cyw_job_codes = context.bindings.cywJobCodes.job_codes;
    const dece_group_codes = context.bindings.deceGroupCodes.group_codes;
    const dece_excluded_job_codes = context.bindings.deceExcludedJobCodes.job_codes;
    const dece_observer_job_codes = context.bindings.deceObserverJobCodes.job_codes;
    const eaa_group_codes = context.bindings.eaaGroupCodes.group_codes;
    const eaa_excluded_job_codes = context.bindings.eaaExcludedJobCodes.job_codes;
    const ess_group_codes = context.bindings.essGroupCodes.group_codes;
    const etfo_group_codes = context.bindings.etfoGroupCodes.group_codes;
    const osstf_contract_group_codes = context.bindings.osstfContractGroupCodes.group_codes;
    const osstf_ot_group_codes = context.bindings.osstfOtGroupCodes.group_codes;
    const pssp_group_codes = context.bindings.psspGroupCodes.group_codes;
    const smaca_group_codes = context.bindings.smacaGroupCodes.group_codes;
    const smaca_elementary_group_codes = context.bindings.smacaElementaryGroupCodes.group_codes;
    const smaca_secondary_group_codes = context.bindings.smacaSecondaryGroupCodes.group_codes;

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
                && row.PANEL
                && !excluded_job_codes.includes(row.JOB_CODE)
                && activity_codes.includes(row.ACTIVITY_CODE)
            ) {
                let email = row.EMAIL_ADDRESS;
                let job_code = row.JOB_CODE;
                let group_code = row.EMP_GROUP_CODE;
                let panel = row.PANEL;

                if (cama_group_codes.includes(group_code)) {
                    if (!members['cama']) {
                        members['cama'] = {};
                    }
                    members['cama'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'cama@wrdsb.ca'
                    };
                }

                if (cyw_job_codes.includes(job_code)) {
                    if (!members['cyw']) {
                        members['cyw'] = {};
                    }
                    members['cyw'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'cyw@wrdsb.ca'
                    };
                }

                if (cyw_job_codes.includes(job_code) && panel == 'E') {
                    if (!members['cyw-elementary']) {
                        members['cyw-elementary'] = {};
                    }
                    members['cyw-elementary'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'cyw-elementary@wrdsb.ca'
                    };
                }

                if (cyw_job_codes.includes(job_code) && panel == 'S') {
                    if (!members['cyw-secondary']) {
                        members['cyw-secondary'] = {};
                    }
                    members['cyw-secondary'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'cyw-secondary@wrdsb.ca'
                    };
                }
        
                //if (dece_group_codes.includes(group_code) && !dece_excluded_job_codes.includes(job_code)) {
                    //if (!members['dece']) {
                        //members['dece'] = {};
                    //}
                    //members['dece'][email] = {
                        //email:          email,
                        //role:           "MEMBER",
                        //status:         "ACTIVE",
                        //type:           "USER",
                        //groupKey:       'dece@wrdsb.ca'
                    //};
                //}

                if (dece_group_codes.includes(group_code) && !dece_excluded_job_codes.includes(job_code)) {
                    if (!members['dece-info']) {
                        members['dece-info'] = {};
                    }
                    members['dece-info'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'dece-info@wrdsb.ca'
                    };
                }

                if (dece_observer_job_codes.includes(job_code)) {
                    if (!members['dece-info']) {
                        members['dece-info'] = {};
                    }
                    members['dece-info'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'dece-info@wrdsb.ca'
                    };
                }

                if (eaa_group_codes.includes(group_code) && !eaa_excluded_job_codes.includes(job_code)) {
                    if (!members['eaa']) {
                        members['eaa'] = {};
                    }
                    members['eaa'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'eaa@wrdsb.ca'
                    };
                    if (panel == 'E') {
                        if (!members['eaa-elementary']) {
                            members['eaa-elementary'] = {};
                        }
                        members['eaa-elementary'][email] = {
                            email:          email,
                            role:           "MEMBER",
                            status:         "ACTIVE",
                            type:           "USER",
                            groupKey:       'eaa-elementary@wrdsb.ca'
                        };
                    }
                    if (panel == 'S') {
                        if (!members['eaa-secondary']) {
                            members['eaa-secondary'] = {};
                        }
                        members['eaa-secondary'][email] = {
                            email:          email,
                            role:           "MEMBER",
                            status:         "ACTIVE",
                            type:           "USER",
                            groupKey:       'eaa-secondary@wrdsb.ca'
                        };
                    }
                }

                if (ess_group_codes.includes(group_code)) {
                    if (!members['ess']) {
                        members['ess'] = {};
                    }
                    members['ess'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'ess@wrdsb.ca'
                    };
                }

                if (etfo_group_codes.includes(group_code)) {
                    if (!members['etfo']) {
                        members['etfo'] = {};
                    }
                    members['etfo'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'etfo@wrdsb.ca'
                    };
                }

                if (osstf_contract_group_codes.includes(group_code)) {
                    if (!members['osstf-contract']) {
                        members['osstf-contract'] = {};
                    }
                    members['osstf-contract'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'osstf-contract@wrdsb.ca'
                    };
                }

                if (osstf_ot_group_codes.includes(group_code)) {
                    if (!members['osstf-ot']) {
                        members['osstf-ot'] = {};
                    }
                    members['osstf-ot'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'osstf-ot@wrdsb.ca'
                    };
                }

                if (pssp_group_codes.includes(group_code)) {
                    if (!members['pssp']) {
                        members['pssp'] = {};
                    }
                    members['pssp'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'pssp@wrdsb.ca'
                    };
                }

                if (smaca_group_codes.includes(group_code)) {
                    if (!members['smaca']) {
                        members['smaca'] = {};
                    }
                    members['smaca'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'smaca@wrdsb.ca'
                    };
                }

                if (smaca_elementary_group_codes.includes(group_code) && panel == 'E') {
                    if (!members['smaca-elementary']) {
                        members['smaca-elementary'] = {};
                    }
                    members['smaca-elementary'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'smaca-elementary@wrdsb.ca'
                    };
                }

                if (smaca_secondary_group_codes.includes(group_code) && panel == 'S') {
                    if (!members['smaca-secondary']) {
                        members['smaca-secondary'] = {};
                    }
                    members['smaca-secondary'][email] = {
                        email:          email,
                        role:           "MEMBER",
                        status:         "ACTIVE",
                        type:           "USER",
                        groupKey:       'smaca-secondary@wrdsb.ca'
                    };
                }
            }
        });
        return members;
    }
};

export default membershipsUnionsCalculate;
