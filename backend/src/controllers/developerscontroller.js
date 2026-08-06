import neo4j from 'neo4j-driver'
import dotenv from 'dotenv'

dotenv.config()

function toNum(val) {
  return neo4j.isInt(val) ? val.toNumber() : val
}
const driver=neo4j.driver(process.env.NEO4J_URI,
    neo4j.auth.basic(process.env.NEO4J_USER,process.env.NEO4J_PASSWORD)
)

// GET /api/developers?search=&limit=
export async function listDevelopers(req, res) {
  const { search = '', limit = '50' } = req.query
  const session = driver.session()

  try {
    const result = await session.run(`
      MATCH (dev:Developer)
      WHERE $search = '' OR toLower(dev.name) CONTAINS toLower($search)
                         OR toLower(dev.username) CONTAINS toLower($search)
      RETURN dev
      ORDER BY dev.followers DESC
      LIMIT $limit
    `, { search, limit: neo4j.int(Number(limit)) })

    const developers = result.records.map(r => {
      const dev = r.get('dev').properties
      return {
        id: toNum(dev.id),
        username: dev.username,
        name: dev.name,
        city: dev.city,
        yearsExperience: toNum(dev.yearsExperience),
        followers: toNum(dev.followers),
        bio: dev.bio,
      }
    })

    res.json({ developers })
  } catch (error) {
    if (error.code?.includes('ServiceUnavailable') || /routing|unavailable/i.test(error.message)) {
      return res.status(503).json({ error: 'Database is currently unreachable. Please try again shortly.' })
    }
    res.status(500).json({ error: error.message })
  } finally {
    await session.close()
  }
}
// GET /api/developers/:username
export async function getDeveloperProfile(req, res) {
  const { username } = req.params
  const session = driver.session()

  try {
    const result = await session.run(`
      MATCH (dev:Developer {username: $username})
      OPTIONAL MATCH (dev)-[s:SKILLED_IN]->(tech:Technology)
      OPTIONAL MATCH (dev)-[c:CONTRIBUTES_TO]->(repo:Repository)
      OPTIONAL MATCH (dev)-[:WORKS_AT]->(org:Organization)
      OPTIONAL MATCH (dev)-[:COLLABORATES_WITH]->(peer:Developer)
      RETURN dev,
        collect(DISTINCT { tech: tech.name, proficiency: s.proficiency, yearsUsing: s.yearsUsing }) AS skills,
        collect(DISTINCT { repo: repo.name, commits: c.commits, role: c.role }) AS repos,
        collect(DISTINCT org.name) AS orgs,
        collect(DISTINCT peer.username) AS collaborators
    `, { username })

    if (result.records.length === 0) {
      return res.status(404).json({ error: 'Developer not found' })
    }

    const record = result.records[0]
    const dev = record.get('dev').properties

    const skills = record.get('skills')
      .filter(s => s.tech !== null)
      .map(s => ({ tech: s.tech, proficiency: s.proficiency, yearsUsing: toNum(s.yearsUsing) }))

    const repos = record.get('repos')
      .filter(r => r.repo !== null)
      .map(r => ({ repo: r.repo, commits: toNum(r.commits), role: r.role }))

    const orgs = record.get('orgs').filter(Boolean)
    const collaborators = record.get('collaborators').filter(Boolean)

    res.json({
      developer: {
        id: toNum(dev.id),
        username: dev.username,
        name: dev.name,
        city: dev.city,
        yearsExperience: toNum(dev.yearsExperience),
        followers: toNum(dev.followers),
        bio: dev.bio,
      },
      skills,
      repos,
      orgs,
      collaborators,
    })
  } catch (error) {
    if (error.code?.includes('ServiceUnavailable') || /routing|unavailable/i.test(error.message)) {
      return res.status(503).json({ error: 'Database is currently unreachable. Please try again shortly.' })
    }
    res.status(500).json({ error: error.message })
  } finally {
    await session.close()
  }
}

// GET /api/developers/skills?skills=React,Node.js
export async function findDevsBySkill(req, res) {
  const { skills } = req.query
  if (!skills) return res.status(400).json({ error: 'skills query param required' })
  const skillNames = skills.split(',').map(s => s.trim())
  const session = driver.session()
  try {
    const result = await session.run(`
      MATCH (dev:Developer)-[:SKILLED_IN]->(tech:Technology)
      WHERE tech.name IN $skillNames
      WITH dev, collect(DISTINCT tech.name) AS skills, count(DISTINCT tech) AS skillCount
      WHERE skillCount = size($skillNames)
      RETURN dev.username AS username, dev.yearsExperience AS yearsExperience, skills
      ORDER BY dev.yearsExperience DESC
    `, { skillNames })
    res.json(result.records.map(r => ({
      username: r.get('username'),
      yearsExperience: toNum(r.get('yearsExperience')),
      skills: r.get('skills'),
    })))
  } catch (error) {
    res.status(500).json({ error: error.message })
  } finally {
    await session.close()
  }
}

// GET /api/developers/:username/recommendations
export async function getRecommendations(req, res) {
  const { username } = req.params
  const session = driver.session()
  try {
    // Step 1: get direct collaborators (simple 1-hop, proven reliable)
    const directResult = await session.run(`
      MATCH (me:Developer {username: $username})-[:COLLABORATES_WITH]->(peer:Developer)
      RETURN peer.username AS username
    `, { username })
    const directUsernames = new Set(directResult.records.map(r => r.get('username')))

    // Step 2: get 2-hop candidates (proven reliable with WITH barrier)
    const candidateResult = await session.run(`
      MATCH (me:Developer {username: $username})-[:COLLABORATES_WITH]->(bridge:Developer)
      WITH me, bridge
      MATCH (bridge)-[:COLLABORATES_WITH]->(candidate:Developer)
      WHERE candidate <> me
      WITH DISTINCT candidate
      RETURN candidate.username AS username, candidate.yearsExperience AS yearsExperience
    `, { username })

    // Step 3: exclude direct collaborators in JS, not Cypher
    const newCandidates = candidateResult.records
      .map(r => ({ username: r.get('username'), yearsExperience: toNum(r.get('yearsExperience')) }))
      .filter(c => !directUsernames.has(c.username))

    // Step 4: for each remaining candidate, get shared technologies (simple 1-hop each)
    const recommendations = []
    for (const candidate of newCandidates) {
      const sharedResult = await session.run(`
        MATCH (me:Developer {username: $username})-[:SKILLED_IN]->(shared:Technology)
        WITH shared
        MATCH (candidate:Developer {username: $candidateUsername})-[:SKILLED_IN]->(shared)
        RETURN shared.name AS techName
      `, { username, candidateUsername: candidate.username })

      const sharedTech = sharedResult.records.map(r => r.get('techName'))
      recommendations.push({
        ...candidate,
        sharedTech,
        sharedCount: sharedTech.length,
      })
    }

    recommendations.sort((a, b) => b.sharedCount - a.sharedCount)

    res.json({ recommendations: recommendations.slice(0, 10) })
  } catch (error) {
    if (error.code?.includes('ServiceUnavailable') || /routing|unavailable/i.test(error.message)) {
      return res.status(503).json({ error: 'Database is currently unreachable. Please try again shortly.' })
    }
    res.status(500).json({ error: error.message })
  } finally {
    await session.close()
  }
}

// GET /api/graph?limit=100
export async function getGraphSnapshot(req, res) {
  const { limit = '100' } = req.query
  const session = driver.session()
  try {
    const result = await session.run(`
      MATCH (n)-[rel]->(m)
      RETURN n, rel, m
      LIMIT $limit
    `, { limit: neo4j.int(Number(limit)) })

    const nodes = new Map()
    const links = []

    for (const record of result.records) {
      const n = record.get('n')
      const m = record.get('m')
      const rel = record.get('rel')
      const nId = n.identity.toString()
      const mId = m.identity.toString()

      if (!nodes.has(nId)) {
        nodes.set(nId, { id: nId, label: n.labels[0], name: n.properties.name || n.properties.username || n.properties.title })
      }
      if (!nodes.has(mId)) {
        nodes.set(mId, { id: mId, label: m.labels[0], name: m.properties.name || m.properties.username || m.properties.title })
      }
      links.push({ source: nId, target: mId, type: rel.type })
    }

    res.json({ nodes: [...nodes.values()], links })
  } catch (error) {
    if (error.code?.includes('ServiceUnavailable') || /routing|unavailable/i.test(error.message)) {
      return res.status(503).json({ error: 'Database is currently unreachable. Please try again shortly.' })
    }
    res.status(500).json({ error: error.message })
  } finally {
    await session.close()
  }
}