import { AzureFunction, Context } from "@azure/functions"

const peopleSetStore: AzureFunction = async function (context: Context, triggerMessage: string): Promise<void> {
    context.log('Queue trigger function processed work item', triggerMessage);
};

export default peopleSetStore;
