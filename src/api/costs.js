import { getSubItems, postSubItem, patchSubItem } from './glpi'

// heures + minutes → secondes pour GLPI
const toBody = ({ name, hours, minutes, hourlyRate, fixedCost }) => ({
  name:      name || '',
  duration:  Math.round((parseFloat(hours   || 0) * 3600)
                      + (parseFloat(minutes || 0) * 60)),
  cost_time:  parseFloat(hourlyRate) || 0,
  cost_fixed: parseFloat(fixedCost)  || 0,
})

export const getTicketCosts   = (ticketId)              => getSubItems('Assistance/Ticket', ticketId, 'Cost')
export const addTicketCost    = (ticketId, data)         => postSubItem ('Assistance/Ticket', ticketId, 'Cost', toBody(data))
export const updateTicketCost = (ticketId, costId, data) => patchSubItem('Assistance/Ticket', ticketId, 'Cost', costId, toBody(data))
