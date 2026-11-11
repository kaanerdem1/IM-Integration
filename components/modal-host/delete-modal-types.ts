export type DeleteLookupInput = {
  id: string;
  readOnly?: boolean;
};

type DeleteInputMap = {
  lookupType: DeleteLookupInput;
  lookupItem: DeleteLookupInput;
  testScenario: DeleteLookupInput;
};

export type DeleteOptions = {
  [K in keyof DeleteInputMap as `${K}Input`]?: DeleteInputMap[K];
};
