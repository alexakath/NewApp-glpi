import { getAllItems, getItem } from "./glpi";

export const getPhones = (params ={}) =>
    getAllItems('Assets/Phone', {sort: 'name', order: 'ASC', ...params})

export const getPhoneFull = (id) => getItem('Assets/Phone', id)