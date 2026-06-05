import { getItems, getItem, getSubItems } from './glpi'

export const getComputers = (params = {}) =>
  getItems('Assets/Computer', { sort: 'name', order: 'ASC', ...params })

export const getComputerFull = async (id) => {
  const [computer, volumes] = await Promise.all([
    getItem('Assets/Computer', id),
    // v2 : Volume remplace Item_Disk
    getSubItems('Assets/Computer', id, 'Volume'),
  ])

  return {
    ...computer,
    _disks: Array.isArray(volumes) ? volumes : [],
  }
}
