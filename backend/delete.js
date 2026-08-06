import neo4j from 'neo4j-driver'
import dotenv from 'dotenv'

dotenv.config()

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
)

const session = driver.session()

async function deleteAll() {
  try {
    console.log('🗑️  Deleting all data...')
    
    await session.run(`
      MATCH (n)
      DETACH DELETE n
    `)
    
    console.log('✅ All data deleted!\n')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  } finally {
    await session.close()
    await driver.close()
  }
}

deleteAll()