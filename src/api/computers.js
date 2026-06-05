import { getItems, getItem, getSubItems } from './glpi'

// Récupère la liste des ordinateurs triés par nom
export const getComputers = (params = {}) =>
  getItems('Computer', { sort: 'name', order: 'ASC', ...params })

// Récupère les données complètes d'un ordinateur :
// - les champs principaux (nom, série, OS, localisation, état...)
//   → users_id et groups_id sont déjà dans l'objet principal grâce à expand_dropdowns
//   → pas besoin de sous-ressource Computer_User (n'existe pas dans l'API GLPI)
// - les disques via Item_Disk
export const getComputerFull = async (id) => {
  const [computer, disks] = await Promise.all([
    getItem('Computer', id),
    getSubItems('Computer', id, 'Item_Disk'),
  ])

  return {
    ...computer,
    _disks: Array.isArray(disks) ? disks : [],
  }
}
