import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.userProfile.upsert({
    where: { id: 'default-user' },
    update: {
      degree: 'Actuarial Science',
      targetMarks: 90,
      explanationPreferences: 'Examples first, then formal reasoning',
      feedbackStrictness: 'HD-level',
      writingStyle: 'Concise and formal'
    },
    create: {
      id: 'default-user',
      name: 'Muks',
      degree: 'Actuarial Science',
      targetMarks: 90,
      explanationPreferences: 'Examples first, then formal reasoning',
      feedbackStrictness: 'HD-level',
      writingStyle: 'Concise and formal'
    }
  })

  const year = await prisma.academicYear.upsert({
    where: { id: 'year-2026' },
    update: {},
    create: {
      id: 'year-2026',
      name: '2026 - 2027',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2027-11-30'),
      userProfileId: user.id
    }
  })

  const semester = await prisma.semester.upsert({
    where: { id: 'sem-2-2026' },
    update: {},
    create: {
      id: 'sem-2-2026',
      name: 'Semester 2 2026',
      startDate: new Date('2026-07-01'),
      endDate: new Date('2026-11-03'),
      academicYearId: year.id
    }
  })

  const unit = await prisma.unit.upsert({
    where: { id: 'unit-etc3430' },
    update: {},
    create: {
      id: 'unit-etc3430',
      code: 'ETC3430',
      name: 'Probability & Stochastic Processes',
      description: 'Core probability models and stochastic processes for actuarial analysis.',
      semesterId: semester.id
    }
  })

  const topic = await prisma.topic.upsert({
    where: { id: 'topic-markov' },
    update: {},
    create: {
      id: 'topic-markov',
      title: 'Markov chains',
      description: 'Transition matrices, steady state, and absorbing states.',
      unitId: unit.id
    }
  })

  await prisma.learningObjective.upsert({
    where: { id: 'lo-1' },
    update: {},
    create: {
      id: 'lo-1',
      description: 'Explain the stationary distribution of a Markov chain.',
      unitId: unit.id
    }
  })

  await prisma.uploadedFile.upsert({
    where: { id: 'upload-lecture1' },
    update: {},
    create: {
      id: 'upload-lecture1',
      filename: 'Lecture-9-Survival-Analysis.pdf',
      category: 'Lecture slides',
      unitId: unit.id
    }
  })

  await prisma.task.upsert({
    where: { id: 'task-quiz-etcl' },
    update: {},
    create: {
      id: 'task-quiz-etcl',
      title: 'Markov chain quiz',
      status: 'Not started',
      priority: 'High',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      unitId: unit.id,
      notes: 'Practice transition matrices and steady-state calculation.'
    }
  })

  await prisma.studyPreferences.upsert({
    where: { id: 'prefs-default' },
    update: {},
    create: {
      id: 'prefs-default',
      pomodoroLength: 25,
      breakLength: 5,
      quizDifficulty: 'Medium',
      preferredStudyTimes: 'Evenings',
      userProfileId: user.id
    }
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
    console.log('Seed completed')
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
