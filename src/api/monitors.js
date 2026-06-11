import { getAllItems, getItem } from './glpi'

export const getMonitors = (params = {}) =>
  getAllItems('Assets/Monitor', { sort: 'name', order: 'ASC', ...params })

export const getMonitorFull = async (id) => {
  const monitor = await getItem('Assets/Monitor', id)

  // v2 : has_* au lieu de have_*
  const features = []
  if (monitor.has_hdmi)        features.push('HDMI')
  if (monitor.has_displayport) features.push('DisplayPort')
  if (monitor.has_dvi)         features.push('DVI')
  if (monitor.has_subd)        features.push('VGA (Sub-D)')
  if (monitor.has_bnc)         features.push('BNC')
  if (monitor.has_pivot)       features.push('Pivot')
  if (monitor.has_microphone)  features.push('Microphone intégré')
  if (monitor.has_speaker)     features.push('Haut-parleurs intégrés')

  return { ...monitor, _features: features }
}
