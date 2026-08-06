import neo4j from 'neo4j-driver'
import dotenv from 'dotenv'

dotenv.config()

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

const session = driver.session()

async function seedData() {
  try {
    console.log('🧹 Clearing existing data (safe to re-run)...')
    await session.run('MATCH (n) DETACH DELETE n')
    console.log('🚀 Starting data seed...\n')

    // =====================
    // CREATE DEVELOPER NODES
    // =====================
    console.log('📝 Creating Developers...')
    const developers = [
      { id: 1, username: 'aanubhavjha27', name: 'Aanubhav Jha', city: 'Noida', yearsExperience: 1, followers: 150, bio: 'Full-stack AI engineer' },
      { id: 2, username: 'john_dev', name: 'John Developer', city: 'Bangalore', yearsExperience: 3, followers: 300, bio: 'Python expert' },
      { id: 3, username: 'sarah_fullstack', name: 'Sarah Chen', city: 'Remote', yearsExperience: 5, followers: 500, bio: 'Full-stack architect' },
      { id: 4, username: 'mike_ml', name: 'Mike Johnson', city: 'San Francisco', yearsExperience: 2, followers: 200, bio: 'ML engineer' },
    ]
    for (const d of developers) {
      await session.run(
        `MERGE (dev:Developer {username: $username})
         SET dev.id = $id, dev.name = $name, dev.city = $city,
             dev.yearsExperience = $yearsExperience, dev.followers = $followers, dev.bio = $bio`,
        d
      )
    }
    console.log('✅ Developers created\n')

    // ========================
    // CREATE TECHNOLOGY NODES
    // ========================
    console.log('📝 Creating Technologies...')
    const technologies = [
      { id: 1, name: 'React', category: 'Frontend', ecosystem: 'JavaScript' },
      { id: 2, name: 'Node.js', category: 'Backend', ecosystem: 'JavaScript' },
      { id: 3, name: 'Python', category: 'Backend', ecosystem: 'Python' },
      { id: 4, name: 'FastAPI', category: 'Framework', ecosystem: 'Python' },
      { id: 5, name: 'PostgreSQL', category: 'Database', ecosystem: 'SQL' },
      { id: 6, name: 'MongoDB', category: 'Database', ecosystem: 'NoSQL' },
      { id: 7, name: 'Express.js', category: 'Framework', ecosystem: 'JavaScript' },
      { id: 8, name: 'TensorFlow', category: 'ML-Library', ecosystem: 'Python' },
    ]
    for (const t of technologies) {
      await session.run(
        `MERGE (tech:Technology {name: $name})
         SET tech.id = $id, tech.category = $category, tech.ecosystem = $ecosystem`,
        t
      )
    }
    console.log('✅ Technologies created\n')

    // =========================
    // CREATE REPOSITORY NODES
    // =========================
    console.log('📝 Creating Repositories...')
    const repositories = [
      { id: 1, name: 'DSAgent', language: 'Python', stars: 50, description: 'AI workflow automation system' },
      { id: 2, name: 'ML-Pipeline', language: 'Python', stars: 200, description: 'Machine learning data pipeline' },
      { id: 3, name: 'ReactUI-Kit', language: 'JavaScript', stars: 500, description: 'React component library' },
      { id: 4, name: 'WebApp', language: 'JavaScript', stars: 100, description: 'Full-stack web application' },
      { id: 5, name: 'FitAgent', language: 'Python', stars: 75, description: 'AI fitness recommendation' },
    ]
    for (const r of repositories) {
      await session.run(
        `MERGE (repo:Repository {name: $name})
         SET repo.id = $id, repo.language = $language, repo.stars = $stars, repo.description = $description`,
        r
      )
    }
    console.log('✅ Repositories created\n')

    // ==========================
    // CREATE ORGANIZATION NODES
    // ==========================
    console.log('📝 Creating Organizations...')
    const organizations = [
      { id: 1, name: 'Google', industry: 'Tech', size: 'Large' },
      { id: 2, name: 'Microsoft', industry: 'Tech', size: 'Large' },
      { id: 3, name: 'Startup-XYZ', industry: 'Tech', size: 'Startup' },
    ]
    for (const o of organizations) {
      await session.run(
        `MERGE (org:Organization {name: $name})
         SET org.id = $id, org.industry = $industry, org.size = $size`,
        o
      )
    }
    console.log('✅ Organizations created\n')

    // =====================
    // CREATE SKILLED_IN — WITH barrier forces sequential resolution
    // (CognoDB planner bug: combined MATCH+WHERE+MERGE on independent
    //  patterns produces a cartesian product instead of filtering first)
    // =====================
    console.log('📝 Creating SKILLED_IN relationships...')

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'React'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 1
    `) // aanubhavjha27 -> React

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'Node.js'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 1
    `) // aanubhavjha27 -> Node.js

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'Python'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Intermediate', r.yearsUsing = 1
    `) // aanubhavjha27 -> Python

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'Python'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Expert', r.yearsUsing = 3
    `) // john_dev -> Python

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'FastAPI'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 2
    `) // john_dev -> FastAPI

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'PostgreSQL'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 3
    `) // john_dev -> PostgreSQL

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'React'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 4
    `) // sarah_fullstack -> React

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'Node.js'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 4
    `) // sarah_fullstack -> Node.js

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'PostgreSQL'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Expert', r.yearsUsing = 5
    `) // sarah_fullstack -> PostgreSQL

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'mike_ml'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'Python'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 2
    `) // mike_ml -> Python

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'mike_ml'
      WITH dev
      MATCH (tech:Technology) WHERE tech.name = 'TensorFlow'
      WITH dev, tech
      MERGE (dev)-[r:SKILLED_IN]->(tech)
      SET r.proficiency = 'Advanced', r.yearsUsing = 2
    `) // mike_ml -> TensorFlow

    console.log('✅ SKILLED_IN relationships created\n')

    // =====================
    // CREATE CONTRIBUTES_TO
    // =====================
    console.log('📝 Creating CONTRIBUTES_TO relationships...')

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'DSAgent'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 150, r.role = 'Creator'
    `) // aanubhavjha27 -> DSAgent (Creator)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'FitAgent'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 120, r.role = 'Creator'
    `) // aanubhavjha27 -> FitAgent (Creator)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'ML-Pipeline'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 500, r.role = 'Creator'
    `) // john_dev -> ML-Pipeline (Creator)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'DSAgent'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 50, r.role = 'Contributor'
    `) // john_dev -> DSAgent (Contributor)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'ReactUI-Kit'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 300, r.role = 'Maintainer'
    `) // sarah_fullstack -> ReactUI-Kit (Maintainer)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'WebApp'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 250, r.role = 'Creator'
    `) // sarah_fullstack -> WebApp (Creator)

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'mike_ml'
      WITH dev
      MATCH (repo:Repository) WHERE repo.name = 'ML-Pipeline'
      WITH dev, repo
      MERGE (dev)-[r:CONTRIBUTES_TO]->(repo)
      SET r.commits = 80, r.role = 'Contributor'
    `) // mike_ml -> ML-Pipeline (Contributor)

    console.log('✅ CONTRIBUTES_TO relationships created\n')

    // =====================
    // CREATE WORKS_AT
    // =====================
    console.log('📝 Creating WORKS_AT relationships...')

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'aanubhavjha27'
      WITH dev
      MATCH (org:Organization) WHERE org.name = 'Startup-XYZ'
      WITH dev, org
      MERGE (dev)-[r:WORKS_AT]->(org)
      SET r.position = 'Junior Developer'
    `) // aanubhavjha27 -> Startup-XYZ

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'john_dev'
      WITH dev
      MATCH (org:Organization) WHERE org.name = 'Microsoft'
      WITH dev, org
      MERGE (dev)-[r:WORKS_AT]->(org)
      SET r.position = 'Senior Developer'
    `) // john_dev -> Microsoft

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'sarah_fullstack'
      WITH dev
      MATCH (org:Organization) WHERE org.name = 'Google'
      WITH dev, org
      MERGE (dev)-[r:WORKS_AT]->(org)
      SET r.position = 'Tech Lead'
    `) // sarah_fullstack -> Google

    await session.run(`
      MATCH (dev:Developer) WHERE dev.username = 'mike_ml'
      WITH dev
      MATCH (org:Organization) WHERE org.name = 'Google'
      WITH dev, org
      MERGE (dev)-[r:WORKS_AT]->(org)
      SET r.position = 'ML Engineer'
    `) // mike_ml -> Google

    console.log('✅ WORKS_AT relationships created\n')

    // =====================
    // CREATE COLLABORATES_WITH (bidirectional)
    // =====================
    console.log('📝 Creating COLLABORATES_WITH relationships...')

    await session.run(`
      MATCH (dev1:Developer) WHERE dev1.username = 'aanubhavjha27'
      WITH dev1
      MATCH (dev2:Developer) WHERE dev2.username = 'john_dev'
      WITH dev1, dev2
      MERGE (dev1)-[r1:COLLABORATES_WITH]->(dev2)
      SET r1.projects = 2
      MERGE (dev2)-[r2:COLLABORATES_WITH]->(dev1)
      SET r2.projects = 2
    `) // aanubhavjha27 <-> john_dev

    await session.run(`
      MATCH (dev1:Developer) WHERE dev1.username = 'aanubhavjha27'
      WITH dev1
      MATCH (dev2:Developer) WHERE dev2.username = 'sarah_fullstack'
      WITH dev1, dev2
      MERGE (dev1)-[r1:COLLABORATES_WITH]->(dev2)
      SET r1.projects = 1
      MERGE (dev2)-[r2:COLLABORATES_WITH]->(dev1)
      SET r2.projects = 1
    `) // aanubhavjha27 <-> sarah_fullstack

    await session.run(`
      MATCH (dev1:Developer) WHERE dev1.username = 'john_dev'
      WITH dev1
      MATCH (dev2:Developer) WHERE dev2.username = 'sarah_fullstack'
      WITH dev1, dev2
      MERGE (dev1)-[r1:COLLABORATES_WITH]->(dev2)
      SET r1.projects = 1
      MERGE (dev2)-[r2:COLLABORATES_WITH]->(dev1)
      SET r2.projects = 1
    `) // john_dev <-> sarah_fullstack

    await session.run(`
      MATCH (dev1:Developer) WHERE dev1.username = 'john_dev'
      WITH dev1
      MATCH (dev2:Developer) WHERE dev2.username = 'mike_ml'
      WITH dev1, dev2
      MERGE (dev1)-[r1:COLLABORATES_WITH]->(dev2)
      SET r1.projects = 1
      MERGE (dev2)-[r2:COLLABORATES_WITH]->(dev1)
      SET r2.projects = 1
    `) // john_dev <-> mike_ml

    console.log('✅ COLLABORATES_WITH relationships created\n')

    // =======================
    // SUMMARY
    // =======================
    console.log('🎉 ==========================================')
    console.log('🎉 ALL DATA SEEDED SUCCESSFULLY!')
    console.log('🎉 ==========================================\n')

    const stats = await session.run(`
      MATCH (d:Developer) WITH count(d) AS devCount
      MATCH (t:Technology) WITH devCount, count(t) AS techCount
      MATCH (r:Repository) WITH devCount, techCount, count(r) AS repoCount
      MATCH (o:Organization) WITH devCount, techCount, repoCount, count(o) AS orgCount
      MATCH (n) RETURN devCount, techCount, repoCount, orgCount, count(n) AS totalNodes
    `)
    const record = stats.records[0]
    console.log('📊 Node Summary:')
    console.log(`   Developers: ${record.get('devCount')}`)
    console.log(`   Technologies: ${record.get('techCount')}`)
    console.log(`   Repositories: ${record.get('repoCount')}`)
    console.log(`   Organizations: ${record.get('orgCount')}`)
    console.log(`   Total Nodes: ${record.get('totalNodes')}\n`)

    const relStats = await session.run(`
      MATCH ()-[r]->() RETURN type(r) AS relType, count(r) AS count ORDER BY relType
    `)
    console.log('📊 Relationship Summary:')
    relStats.records.forEach(r => {
      console.log(`   ${r.get('relType')}: ${r.get('count')}`)
    })
    console.log('')

  } catch (error) {
    console.error('❌ Error seeding data:', error.message)
  } finally {
    await session.close()
    await driver.close()
  }
}

seedData()