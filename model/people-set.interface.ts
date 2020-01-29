type PeopleSetType = string[];
type PeopleSetSet = string[];

interface PeopleSet
{
    id: string;

    atomic: boolean;

    type: PeopleSetType;

    name: string,
    short_name: string;
    aliases: string[];

    categories: string[];
    tags: string[];

    definition: PeopleSetSet[];
}

export { PeopleSetType, PeopleSetSet, PeopleSet };
