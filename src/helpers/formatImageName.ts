export const formatImageName = (name: string) => {
  const strWithoutDiacritics = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const strWithoutSpaces = strWithoutDiacritics.replace(/\s/g, '');
  const current = new Date();
  return strWithoutSpaces.toLowerCase() + current.getTime();
};
