const identificationSign = '___';

export const convertPath = (path, option?) => {
  return option === 'slash' ? path.split(identificationSign).join('/') : path.split('/').join(identificationSign);
};
