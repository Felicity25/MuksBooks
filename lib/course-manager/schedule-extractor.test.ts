import assert from 'node:assert/strict'
import { extractScheduleFromText } from './schedule-extractor'

const etc3420 = `
ETC3420 Applied insurance methods
Teaching schedule
Week | Topics and concepts | Tutorial activities | Assessment
0 | Revision of previous topics and skills; Probability; R coding; Presentation and Teamwork skills | Tutorial introduction |
1 | Risk Distribution 1 | Tutorial presentations | Moodle quiz 1
2 | Risk Distribution 2; Individual Risk 1 | Tutorial presentations | Moodle quiz 2
3 | Individual Risk 2 | Tutorial presentations |
4 | Collective Risk 1 | Tutorial presentations | Assignment pre-submission due 24 Aug
5 | Collective Risk 2 | Tutorial presentations |
6 | Risk Theory 1 | Tutorial presentations |
7 | Risk Theory 2 | Tutorial presentations |
8 | Premium & Reserving | Tutorial presentations |
9 | Extreme Value Theory 1 | Tutorial presentations |
10 | Extreme Value Theory 2; Copula 1 | Tutorial presentations |
11 | Copula 2 | Tutorial presentations | Assignment final submission due 28 Sep
12 | Revision | Tutorial presentations |

Assessment summary
Tutorial Presentations | 5%
Moodle quizzes | 15%
Assignment | 20% | final submission 28 Sep
Final exam | 60%
`

const result = extractScheduleFromText('ETC3420-unit-guide.pdf', etc3420)
assert.equal(result.parser, 'structural')
assert.equal(result.isLikelySchedule, true)
assert.deepEqual(result.entries.map((entry) => entry.weekNumber), Array.from({ length: 13 }, (_, index) => index))
assert.deepEqual(
  [result.entries[0].topic, ...result.entries[0].additionalTopics],
  ['Revision of previous topics and skills', 'Probability', 'R coding', 'Presentation and Teamwork skills']
)
assert.deepEqual(result.entries.map((entry) => [entry.topic, ...entry.additionalTopics]), [
  ['Revision of previous topics and skills', 'Probability', 'R coding', 'Presentation and Teamwork skills'],
  ['Risk Distribution 1'],
  ['Risk Distribution 2', 'Individual Risk 1'],
  ['Individual Risk 2'],
  ['Collective Risk 1'],
  ['Collective Risk 2'],
  ['Risk Theory 1'],
  ['Risk Theory 2'],
  ['Premium & Reserving'],
  ['Extreme Value Theory 1'],
  ['Extreme Value Theory 2', 'Copula 1'],
  ['Copula 2'],
  ['Revision']
])
assert.deepEqual(result.entries[1].activities, ['Tutorial presentations'])
assert.deepEqual(result.entries[1].assessmentReferences, ['Moodle quiz 1'])
assert.equal(result.entries.some((entry) => entry.additionalTopics.some((topic) => /moodle quiz|tutorial presentations/i.test(topic))), false)
assert.equal(result.entries.some((entry) => entry.isBreak), false)
assert.deepEqual(result.assessments.map((assessment) => assessment.weighting).filter((weighting) => weighting !== null), [5, 15, 20, 60])
assert.equal(result.assessments.some((assessment) => assessment.dueDateText === '24 Aug'), true)
assert.equal(result.assessments.some((assessment) => assessment.dueDateText === '28 Sep'), true)

const unfamiliarLayout = `
Module\tLearning material\tWorkshop\tDue
0\tFoundations; notation\tSetup exercise\t
1\tMarkov property\tSimulation lab\tQuiz 1
2\tTransition matrices\tProblem class\t
`
const unfamiliar = extractScheduleFromText('outline.txt', unfamiliarLayout)
assert.equal(unfamiliar.parser, 'structural')
assert.deepEqual(unfamiliar.entries.map((entry) => entry.weekNumber), [0, 1, 2])
assert.deepEqual(unfamiliar.entries[1].activities, ['Simulation lab'])
assert.deepEqual(unfamiliar.entries[1].assessmentReferences, ['Quiz 1'])

const shapes = [
  `Week 0: Foundations\nWeek 1: Probability\nWeek 2: Models`,
  `Teaching Week | Topic\n0 | Foundations\n1 | Probability\n2 | Models`,
  `Week\tContent\tActivity\n0\tFoundations\tSetup\n1\tProbability\tLab\n2\tModels\tTutorial`,
  `Week 0  Foundations\nWeek 1  Probability\nWeek 2  Models`,
  `Module | Learning material\n0 | Foundations\n1 | Probability\n2 | Models`,
  `Period | Curriculum\n0 | Foundations; notation\n1 | Probability; simulation\n2 | Models`,
  `Week | Topic | Due\n0 | Foundations |\n1 | Probability | Quiz 1\n2 | Models | Assignment`,
  `Week | Topic\n0 | Foundations\n1 | Mid-semester break\n2 | Models`,
  `0 | Foundations\n1 | Probability\n2 | Models`,
  `Teaching Week | Lecture content | Workshop activities | Assessment\n0 | Foundations | Setup |\n1 | Probability | Simulation | Quiz 1\n2 | Models | Problems |`
]

shapes.forEach((shape, index) => {
  const parsed = extractScheduleFromText(`shape-${index + 1}.txt`, shape)
  assert.equal(parsed.isLikelySchedule, true, `shape ${index + 1} should be detected`)
  assert.deepEqual(parsed.entries.map((entry) => entry.weekNumber), [0, 1, 2], `shape ${index + 1} periods`)
})

console.log('schedule-extractor: all assertions passed')