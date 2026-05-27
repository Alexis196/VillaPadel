import { db } from './config'
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore'

// Escala numérica APA: 1ra=1, 2da=2, 3ra=3, 4ta=4, 5ta=5, 6ta=6, 7ma=7
const categories = [
  {
    id: 'cat-1ra',
    name: '1ra Categoría',
    categoriaValor: 1,
    description: 'Nivel competitivo avanzado',
    color: '#f97316',
    icon: '🏆',
    status: 'En curso',
    statusColor: '#22c55e',
    teams: 8,
    players: 16,
    matches: '7/12',
  },
  {
    id: 'cat-2da',
    name: '2da Categoría',
    categoriaValor: 2,
    description: 'Nivel competitivo intermedio',
    color: '#a855f7',
    icon: '🥈',
    status: 'En curso',
    statusColor: '#22c55e',
    teams: 8,
    players: 16,
    matches: '4/12',
  },
  {
    id: 'cat-3ra',
    name: '3ra Categoría',
    categoriaValor: 3,
    description: 'Nivel iniciación avanzado',
    color: '#3b82f6',
    icon: '🥉',
    status: 'En curso',
    statusColor: '#22c55e',
    teams: 6,
    players: 12,
    matches: '3/9',
  },
  {
    id: 'cat-4ta',
    name: '4ta Categoría',
    categoriaValor: 4,
    description: 'Nivel iniciación inicial',
    color: '#10b981',
    icon: '🎾',
    status: 'Inscripción',
    statusColor: '#f97316',
    teams: 4,
    players: 8,
    matches: '0/6',
  },
  {
    id: 'cat-fem',
    name: 'Femenino A',
    categoriaValor: 2,
    description: 'Categoría femenina competitiva',
    color: '#ec4899',
    icon: '👩',
    status: 'En curso',
    statusColor: '#22c55e',
    teams: 4,
    players: 8,
    matches: '2/6',
  },
  {
    id: 'cat-mix',
    name: 'Mixto',
    categoriaValor: 3,
    description: 'Parejas mixtas',
    color: '#f59e0b',
    icon: '🤝',
    status: 'Pendiente',
    statusColor: '#6366f1',
    teams: 6,
    players: 12,
    matches: '0/9',
  },
]

const groups = [
  { id: 'group-a', name: 'Grupo A', categoryId: 'cat-1ra' },
  { id: 'group-b', name: 'Grupo B', categoryId: 'cat-1ra' },
  { id: 'group-c', name: 'Grupo C', categoryId: 'cat-1ra' },
  { id: 'group-d', name: 'Grupo D', categoryId: 'cat-1ra' },
]

const teams = [
  // Grupo A
  { id: 'team-1', name: 'Los Guerreros', players: 'G. Ruiz · M. López', groupId: 'group-a', categoryId: 'cat-1ra' },
  { id: 'team-2', name: 'Smash Kings', players: 'D. Torres · A. Pérez', groupId: 'group-a', categoryId: 'cat-1ra' },
  { id: 'team-3', name: 'Padel Force', players: 'R. García · J. Martínez', groupId: 'group-a', categoryId: 'cat-1ra' },
  { id: 'team-4', name: 'Los Titanes', players: 'F. Soto · P. Navarro', groupId: 'group-a', categoryId: 'cat-1ra' },
  // Grupo B
  { id: 'team-5', name: 'Net Masters', players: 'A. Díaz · L. Fernández', groupId: 'group-b', categoryId: 'cat-1ra' },
  { id: 'team-6', name: 'Raqueta Dorada', players: 'M. Silva · N. Castro', groupId: 'group-b', categoryId: 'cat-1ra' },
  { id: 'team-7', name: 'Los Cracks', players: 'G. Morales · T. Herrera', groupId: 'group-b', categoryId: 'cat-1ra' },
  { id: 'team-8', name: 'Ace Team', players: 'G. Romero · E. Vargas', groupId: 'group-b', categoryId: 'cat-1ra' },
  // Grupo C
  { id: 'team-9', name: 'Thunder Padel', players: 'J. Mendoza · R. Jiménez', groupId: 'group-c', categoryId: 'cat-1ra' },
  { id: 'team-10', name: 'Los Halcones', players: 'I. Flores · D. Aguilar', groupId: 'group-c', categoryId: 'cat-1ra' },
  { id: 'team-11', name: 'Padel Black', players: 'C. Reyes · G. Guzmán', groupId: 'group-c', categoryId: 'cat-1ra' },
  { id: 'team-12', name: 'Team Puma', players: 'M. Vidal · R. Delgado', groupId: 'group-c', categoryId: 'cat-1ra' },
  // Grupo D
  { id: 'team-13', name: 'Los Campeones', players: 'A. Méndez · W. Hugo', groupId: 'group-d', categoryId: 'cat-1ra' },
  { id: 'team-14', name: 'Padel Express', players: 'G. Salazar · J. Rivas', groupId: 'group-d', categoryId: 'cat-1ra' },
  { id: 'team-15', name: 'Wild Cards', players: 'P. Cabral · P. Luzardo', groupId: 'group-d', categoryId: 'cat-1ra' },
  { id: 'team-16', name: 'Los Ases', players: 'J. Heredia · B. Rocamora', groupId: 'group-d', categoryId: 'cat-1ra' },
]

const standings = [
  // Grupo A
  { id: 'st-1', teamId: 'team-1', teamName: 'Los Guerreros', groupId: 'group-a', PJ: 3, PG: 3, PP: 0, setsF: 6, setsC: 1, diff: 5, pts: 9 },
  { id: 'st-2', teamId: 'team-2', teamName: 'Smash Kings', groupId: 'group-a', PJ: 3, PG: 2, PP: 1, setsF: 5, setsC: 3, diff: 2, pts: 6 },
  { id: 'st-3', teamId: 'team-3', teamName: 'Padel Force', groupId: 'group-a', PJ: 3, PG: 1, PP: 2, setsF: 3, setsC: 5, diff: -2, pts: 3 },
  { id: 'st-4', teamId: 'team-4', teamName: 'Los Titanes', groupId: 'group-a', PJ: 3, PG: 0, PP: 3, setsF: 1, setsC: 6, diff: -5, pts: 0 },
  // Grupo B
  { id: 'st-5', teamId: 'team-5', teamName: 'Net Masters', groupId: 'group-b', PJ: 3, PG: 3, PP: 0, setsF: 6, setsC: 0, diff: 6, pts: 9 },
  { id: 'st-6', teamId: 'team-6', teamName: 'Raqueta Dorada', groupId: 'group-b', PJ: 3, PG: 2, PP: 1, setsF: 4, setsC: 3, diff: 1, pts: 6 },
  { id: 'st-7', teamId: 'team-7', teamName: 'Los Cracks', groupId: 'group-b', PJ: 3, PG: 1, PP: 2, setsF: 2, setsC: 4, diff: -2, pts: 3 },
  { id: 'st-8', teamId: 'team-8', teamName: 'Ace Team', groupId: 'group-b', PJ: 3, PG: 0, PP: 3, setsF: 1, setsC: 6, diff: -5, pts: 0 },
  // Grupo C
  { id: 'st-9', teamId: 'team-9', teamName: 'Thunder Padel', groupId: 'group-c', PJ: 3, PG: 2, PP: 1, setsF: 5, setsC: 3, diff: 2, pts: 6 },
  { id: 'st-10', teamId: 'team-10', teamName: 'Los Halcones', groupId: 'group-c', PJ: 3, PG: 2, PP: 1, setsF: 4, setsC: 3, diff: 1, pts: 6 },
  { id: 'st-11', teamId: 'team-11', teamName: 'Padel Black', groupId: 'group-c', PJ: 3, PG: 1, PP: 2, setsF: 3, setsC: 4, diff: -1, pts: 3 },
  { id: 'st-12', teamId: 'team-12', teamName: 'Team Puma', groupId: 'group-c', PJ: 3, PG: 1, PP: 2, setsF: 2, setsC: 4, diff: -2, pts: 3 },
  // Grupo D
  { id: 'st-13', teamId: 'team-13', teamName: 'Los Campeones', groupId: 'group-d', PJ: 3, PG: 3, PP: 0, setsF: 6, setsC: 2, diff: 4, pts: 9 },
  { id: 'st-14', teamId: 'team-14', teamName: 'Padel Express', groupId: 'group-d', PJ: 3, PG: 2, PP: 1, setsF: 5, setsC: 3, diff: 2, pts: 6 },
  { id: 'st-15', teamId: 'team-15', teamName: 'Wild Cards', groupId: 'group-d', PJ: 3, PG: 1, PP: 2, setsF: 2, setsC: 5, diff: -3, pts: 3 },
  { id: 'st-16', teamId: 'team-16', teamName: 'Los Ases', groupId: 'group-d', PJ: 3, PG: 0, PP: 3, setsF: 1, setsC: 4, diff: -3, pts: 0 },
]

const matches = [
  // Jornada 1 - Grupo A
  { id: 'match-1', teamA: 'Los Guerreros', teamB: 'Smash Kings', scoreA: 2, scoreB: 1, groupId: 'group-a', jornada: 1, status: 'Finalizado' },
  { id: 'match-2', teamA: 'Padel Force', teamB: 'Los Titanes', scoreA: 2, scoreB: 0, groupId: 'group-a', jornada: 1, status: 'Finalizado' },
  // Jornada 1 - Grupo B
  { id: 'match-3', teamA: 'Net Masters', teamB: 'Raqueta Dorada', scoreA: 2, scoreB: 0, groupId: 'group-b', jornada: 1, status: 'Finalizado' },
  { id: 'match-4', teamA: 'Los Cracks', teamB: 'Ace Team', scoreA: 0, scoreB: 2, groupId: 'group-b', jornada: 1, status: 'Finalizado' },
  // Jornada 2 - Grupo A
  { id: 'match-5', teamA: 'Padel Ravines', teamB: 'Net Killers', scoreA: 2, scoreB: 1, groupId: 'group-a', jornada: 2, status: 'Finalizado' },
  { id: 'match-6', teamA: 'Los Vikings', teamB: 'Padel Madrid', scoreA: 0, scoreB: 2, groupId: 'group-b', jornada: 2, status: 'Finalizado' },
  // Jornada 3 - Próximos
  { id: 'match-7', teamA: 'Los Guerreros', teamB: 'Padel Force', scoreA: null, scoreB: null, groupId: 'group-a', jornada: 3, status: 'Programado' },
  { id: 'match-8', teamA: 'Net Masters', teamB: 'Los Cracks', scoreA: null, scoreB: null, groupId: 'group-b', jornada: 3, status: 'Programado' },
  // Jornada 4 - Próximos
  { id: 'match-9', teamA: 'Smash Kings', teamB: 'Los Titanes', scoreA: null, scoreB: null, groupId: 'group-a', jornada: 4, status: 'Programado' },
  { id: 'match-10', teamA: 'Raqueta Dorada', teamB: 'Ace Team', scoreA: null, scoreB: null, groupId: 'group-b', jornada: 4, status: 'Programado' },
]

const players = [
  // Grupo A — Los Guerreros
  { id: 'p-1',  name: 'Gonzalo Ruiz',      teamId: 'team-1', teamName: 'Los Guerreros',   groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-2',  name: 'Marcos López',       teamId: 'team-1', teamName: 'Los Guerreros',   groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Revés' },
  // Grupo A — Smash Kings
  { id: 'p-3',  name: 'Diego Torres',       teamId: 'team-2', teamName: 'Smash Kings',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-4',  name: 'Andrés Pérez',       teamId: 'team-2', teamName: 'Smash Kings',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo A — Padel Force
  { id: 'p-5',  name: 'Rodrigo García',     teamId: 'team-3', teamName: 'Padel Force',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-6',  name: 'Juan Martínez',      teamId: 'team-3', teamName: 'Padel Force',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo A — Los Titanes
  { id: 'p-7',  name: 'Federico Soto',      teamId: 'team-4', teamName: 'Los Titanes',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-8',  name: 'Pablo Navarro',      teamId: 'team-4', teamName: 'Los Titanes',     groupId: 'group-a', groupName: 'Grupo A', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Revés' },
  // Grupo B — Net Masters
  { id: 'p-9',  name: 'Alejandro Díaz',     teamId: 'team-5', teamName: 'Net Masters',     groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-10', name: 'Lucas Fernández',    teamId: 'team-5', teamName: 'Net Masters',     groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo B — Raqueta Dorada
  { id: 'p-11', name: 'Matías Silva',       teamId: 'team-6', teamName: 'Raqueta Dorada',  groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-12', name: 'Nicolás Castro',     teamId: 'team-6', teamName: 'Raqueta Dorada',  groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo B — Los Cracks
  { id: 'p-13', name: 'Gastón Morales',     teamId: 'team-7', teamName: 'Los Cracks',      groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-14', name: 'Tomás Herrera',      teamId: 'team-7', teamName: 'Los Cracks',      groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo B — Ace Team
  { id: 'p-15', name: 'Gonzalo Romero',     teamId: 'team-8', teamName: 'Ace Team',        groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-16', name: 'Emilio Vargas',      teamId: 'team-8', teamName: 'Ace Team',        groupId: 'group-b', groupName: 'Grupo B', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo C — Thunder Padel
  { id: 'p-17', name: 'Javier Mendoza',     teamId: 'team-9', teamName: 'Thunder Padel',   groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-18', name: 'Ramiro Jiménez',     teamId: 'team-9', teamName: 'Thunder Padel',   groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Revés' },
  // Grupo C — Los Halcones
  { id: 'p-19', name: 'Ignacio Flores',     teamId: 'team-10', teamName: 'Los Halcones',   groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-20', name: 'Diego Aguilar',      teamId: 'team-10', teamName: 'Los Halcones',   groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo C — Padel Black
  { id: 'p-21', name: 'Carlos Reyes',       teamId: 'team-11', teamName: 'Padel Black',    groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-22', name: 'Gabriel Guzmán',     teamId: 'team-11', teamName: 'Padel Black',    groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo C — Team Puma
  { id: 'p-23', name: 'Maximiliano Vidal',  teamId: 'team-12', teamName: 'Team Puma',      groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-24', name: 'Rodrigo Delgado',    teamId: 'team-12', teamName: 'Team Puma',      groupId: 'group-c', groupName: 'Grupo C', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo D — Los Campeones
  { id: 'p-25', name: 'Agustín Méndez',     teamId: 'team-13', teamName: 'Los Campeones',  groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-26', name: 'Walter Hugo',        teamId: 'team-13', teamName: 'Los Campeones',  groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo D — Padel Express
  { id: 'p-27', name: 'Gustavo Salazar',    teamId: 'team-14', teamName: 'Padel Express',  groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-28', name: 'Julián Rivas',       teamId: 'team-14', teamName: 'Padel Express',  groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Revés' },
  // Grupo D — Wild Cards
  { id: 'p-29', name: 'Patricio Cabral',    teamId: 'team-15', teamName: 'Wild Cards',     groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Drive' },
  { id: 'p-30', name: 'Pablo Luzardo',      teamId: 'team-15', teamName: 'Wild Cards',     groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // Grupo D — Los Ases
  { id: 'p-31', name: 'Jorge Heredia',      teamId: 'team-16', teamName: 'Los Ases',       groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Izquierda', position: 'Drive' },
  { id: 'p-32', name: 'Bruno Rocamora',     teamId: 'team-16', teamName: 'Los Ases',       groupId: 'group-d', groupName: 'Grupo D', categoryId: 'cat-1ra', categoryName: '1ra Categoría', categoriaValor: 1, categoryColor: '#f97316', hand: 'Derecha', position: 'Revés' },
  // 2da Categoría
  { id: 'p-33', name: 'Santiago Peralta',   teamId: 'team-17', teamName: 'Los Fieras',     groupId: 'group-e', groupName: 'Grupo E', categoryId: 'cat-2da', categoryName: '2da Categoría', categoriaValor: 2, categoryColor: '#a855f7', hand: 'Derecha', position: 'Drive' },
  { id: 'p-34', name: 'Hernán Quiroga',     teamId: 'team-17', teamName: 'Los Fieras',     groupId: 'group-e', groupName: 'Grupo E', categoryId: 'cat-2da', categoryName: '2da Categoría', categoriaValor: 2, categoryColor: '#a855f7', hand: 'Izquierda', position: 'Revés' },
  { id: 'p-35', name: 'Leandro Bustos',     teamId: 'team-18', teamName: 'Padeleros',      groupId: 'group-e', groupName: 'Grupo E', categoryId: 'cat-2da', categoryName: '2da Categoría', categoriaValor: 2, categoryColor: '#a855f7', hand: 'Derecha', position: 'Drive' },
  { id: 'p-36', name: 'Sebastián Molina',   teamId: 'team-18', teamName: 'Padeleros',      groupId: 'group-e', groupName: 'Grupo E', categoryId: 'cat-2da', categoryName: '2da Categoría', categoriaValor: 2, categoryColor: '#a855f7', hand: 'Derecha', position: 'Revés' },
  // 3ra Categoría
  { id: 'p-37', name: 'Tomás Bravo',        teamId: 'team-19', teamName: 'Los Novatos',    groupId: 'group-f', groupName: 'Grupo F', categoryId: 'cat-3ra', categoryName: '3ra Categoría', categoriaValor: 3, categoryColor: '#3b82f6', hand: 'Derecha', position: 'Drive' },
  { id: 'p-38', name: 'Mateo Ríos',         teamId: 'team-19', teamName: 'Los Novatos',    groupId: 'group-f', groupName: 'Grupo F', categoryId: 'cat-3ra', categoryName: '3ra Categoría', categoriaValor: 3, categoryColor: '#3b82f6', hand: 'Izquierda', position: 'Revés' },
  // Femenino A
  { id: 'p-39', name: 'Valentina Cruz',     teamId: 'team-20', teamName: 'Las Guerreras',  groupId: 'group-g', groupName: 'Grupo G', categoryId: 'cat-fem', categoryName: 'Femenino A',    categoriaValor: 2, categoryColor: '#ec4899', hand: 'Derecha', position: 'Drive' },
  { id: 'p-40', name: 'Camila Ortiz',       teamId: 'team-20', teamName: 'Las Guerreras',  groupId: 'group-g', groupName: 'Grupo G', categoryId: 'cat-fem', categoryName: 'Femenino A',    categoriaValor: 2, categoryColor: '#ec4899', hand: 'Izquierda', position: 'Revés' },
  { id: 'p-41', name: 'Luciana Romero',     teamId: 'team-21', teamName: 'Smash Girls',    groupId: 'group-g', groupName: 'Grupo G', categoryId: 'cat-fem', categoryName: 'Femenino A',    categoriaValor: 2, categoryColor: '#ec4899', hand: 'Derecha', position: 'Drive' },
  { id: 'p-42', name: 'Sofía Mendez',       teamId: 'team-21', teamName: 'Smash Girls',    groupId: 'group-g', groupName: 'Grupo G', categoryId: 'cat-fem', categoryName: 'Femenino A',    categoriaValor: 2, categoryColor: '#ec4899', hand: 'Derecha', position: 'Revés' },
]

export async function seedDatabase() {
  const batch = writeBatch(db)

  for (const cat of categories) {
    batch.set(doc(db, 'categories', cat.id), cat)
  }
  for (const group of groups) {
    batch.set(doc(db, 'groups', group.id), group)
  }
  for (const team of teams) {
    batch.set(doc(db, 'teams', team.id), team)
  }
  for (const st of standings) {
    batch.set(doc(db, 'standings', st.id), st)
  }
  for (const match of matches) {
    batch.set(doc(db, 'matches', match.id), match)
  }
  for (const player of players) {
    batch.set(doc(db, 'players', player.id), player)
  }

  await batch.commit()
  console.log('Database seeded successfully!')
}
