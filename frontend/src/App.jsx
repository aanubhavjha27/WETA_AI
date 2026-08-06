import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ForceGraph2D from 'react-force-graph-2d'

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  timeout: 8000,
})

function getErrorMessage(error) {
  if (error.response?.status === 503) return 'The database is currently unreachable. Please try again shortly.'
  if (error.response?.data?.error) return error.response.data.error
  if (error.request) return 'Could not reach the server. Is the backend running?'
  return 'Something went wrong.'
}

const NODE_COLORS = {
  Developer: '#6366f1',
  Technology: '#10b981',
  Repository: '#f59e0b',
  Organization: '#ef4444',
  Issue: '#6b7280',
}

// ============================================================
// APP — top-level view switcher, no router needed
// ============================================================
export default function App() {
  const [view, setView] = useState('list') // 'list' | 'profile' | 'graph'
  const [selectedUsername, setSelectedUsername] = useState(null)

  function goToProfile(username) {
    setSelectedUsername(username)
    setView('profile')
  }

  function goToList() {
    setSelectedUsername(null)
    setView('list')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white px-6 py-4 flex items-center gap-6 sticky top-0 z-10">
        <span className="font-semibold text-gray-900">DevGraph</span>
        <button
          onClick={goToList}
          className={`text-sm ${view !== 'graph' ? 'text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Developers
        </button>
        <button
          onClick={() => setView('graph')}
          className={`text-sm ${view === 'graph' ? 'text-indigo-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Network Graph
        </button>
      </nav>

      <main>
        {view === 'list' && <DeveloperList onSelect={goToProfile} />}
        {view === 'profile' && <DeveloperProfile username={selectedUsername} onBack={goToList} />}
        {view === 'graph' && <GraphView />}
      </main>
    </div>
  )
}

// ============================================================
// DEVELOPER LIST
// ============================================================
function DeveloperList({ onSelect }) {
  const [developers, setDevelopers] = useState([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('loading') // loading | ready | empty | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    const t = setTimeout(fetchDevelopers, 300)
    return () => clearTimeout(t)
  }, [search])

  async function fetchDevelopers() {
    setStatus('loading')
    try {
      const res = await api.get('/developers', { params: { search } })
      const devs = res.data.developers || []
      setDevelopers(devs)
      setStatus(devs.length === 0 ? 'empty' : 'ready')
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
      setStatus('error')
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Developers</h1>
      <p className="text-gray-500 mb-6">Explore the network by name or username.</p>

      <input
        type="text"
        placeholder="Search by name or username…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 mb-6
                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />

      {status === 'loading' && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3">{errorMsg}</div>
      )}

      {status === 'empty' && (
        <div className="text-center text-gray-500 py-16 border border-dashed border-gray-300 rounded-lg">
          No developers match "{search}".
        </div>
      )}

      {status === 'ready' && (
        <div className="grid gap-3">
          {developers.map((dev) => (
            <button
              key={dev.username}
              onClick={() => onSelect(dev.username)}
              className="text-left block w-full border border-gray-200 rounded-lg px-5 py-4
                         hover:border-indigo-400 hover:shadow-sm transition bg-white"
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{dev.name}</div>
                  <div className="text-sm text-gray-500">@{dev.username} · {dev.city}</div>
                </div>
                <div className="text-sm text-gray-400">{dev.followers} followers</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// DEVELOPER PROFILE
// ============================================================
function DeveloperProfile({ username, onBack }) {
  const [profile, setProfile] = useState(null)
  const [recommendations, setRecommendations] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error | notfound
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (username) fetchProfile()
  }, [username])

  async function fetchProfile() {
    setStatus('loading')
    try {
      const [profileRes, recRes] = await Promise.all([
        api.get(`/developers/${username}`),
        api.get(`/developers/${username}/recommendations`),
      ])
      setProfile(profileRes.data)
      setRecommendations(profileRes.data ? recRes.data.recommendations || [] : [])
      setStatus('ready')
    } catch (err) {
      if (err.response?.status === 404) {
        setStatus('notfound')
      } else {
        setErrorMsg(getErrorMessage(err))
        setStatus('error')
      }
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-sm text-indigo-600 hover:underline mb-6">
        ← Back to developers
      </button>

      {status === 'loading' && (
        <div className="space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-40 bg-gray-100 rounded-lg animate-pulse" />
        </div>
      )}

      {status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3">{errorMsg}</div>
      )}

      {status === 'notfound' && (
        <div className="text-center text-gray-500 py-16 border border-dashed border-gray-300 rounded-lg">
          Developer "{username}" not found.
        </div>
      )}

      {status === 'ready' && profile && (
        <div className="space-y-6">
          <div className="border border-gray-200 rounded-lg p-6 bg-white">
            <h1 className="text-xl font-semibold text-gray-900">{profile.developer.name}</h1>
            <p className="text-gray-500 text-sm mb-2">
              @{profile.developer.username} · {profile.developer.city} · {profile.developer.yearsExperience} yrs experience
            </p>
            <p className="text-gray-700">{profile.developer.bio}</p>
            {profile.orgs?.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">Works at: {profile.orgs.join(', ')}</p>
            )}
          </div>

          <Section title="Skills">
            {profile.skills.length === 0 ? (
              <EmptyRow text="No skills recorded." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((s) => (
                  <span key={s.tech} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm rounded-full">
                    {s.tech} · {s.proficiency}
                  </span>
                ))}
              </div>
            )}
          </Section>

          <Section title="Repositories">
            {profile.repos.length === 0 ? (
              <EmptyRow text="No repository contributions recorded." />
            ) : (
              <ul className="space-y-2">
                {profile.repos.map((r) => (
                  <li key={r.repo} className="flex justify-between text-sm border-b border-gray-100 pb-2">
                    <span className="text-gray-900">{r.repo}</span>
                    <span className="text-gray-500">{r.role} · {r.commits} commits</span>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Recommended Collaborators">
            {recommendations.length === 0 ? (
              <EmptyRow text="No new collaborator recommendations right now." />
            ) : (
              <div className="grid gap-2">
                {recommendations.map((r) => (
                  <div key={r.username} className="flex justify-between items-center border border-gray-200 rounded-lg px-4 py-3">
                    <span className="text-gray-900 font-medium">@{r.username}</span>
                    <span className="text-sm text-gray-500">
                      {r.sharedCount > 0 ? `Shares: ${r.sharedTech.join(', ')}` : 'No shared skills yet'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">{title}</h2>
      {children}
    </div>
  )
}

function EmptyRow({ text }) {
  return <p className="text-sm text-gray-400 italic">{text}</p>
}

// ============================================================
// GRAPH VIEW
// ============================================================
function GraphView() {
  const [graph, setGraph] = useState(null)
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    fetchGraph()
  }, [])

  async function fetchGraph() {
    setStatus('loading')
    try {
      const res = await api.get('/graph', { params: { limit: 100 } })
      setGraph(res.data)
      setStatus(res.data.nodes.length === 0 ? 'empty' : 'ready')
    } catch (err) {
      setErrorMsg(getErrorMessage(err))
      setStatus('error')
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-semibold text-gray-900 mb-1">Network Graph</h1>
      <p className="text-gray-500 mb-4">
        A live snapshot of nodes and relationships. Drag nodes, scroll to zoom.
      </p>

      {status === 'ready' && (
        <div className="flex gap-4 mb-4 text-sm">
          {Object.entries(NODE_COLORS).map(([label, color]) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              <span className="text-gray-600">{label}</span>
            </div>
          ))}
        </div>
      )}

      {status === 'loading' && <div className="h-[500px] bg-gray-100 rounded-lg animate-pulse" />}

      {status === 'error' && (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-lg px-4 py-3">{errorMsg}</div>
      )}

      {status === 'empty' && (
        <div className="text-center text-gray-500 py-16 border border-dashed border-gray-300 rounded-lg">
          No graph data available yet. Run the seed script to load sample data.
        </div>
      )}

      {status === 'ready' && graph && (
        <div ref={containerRef} className="border border-gray-200 rounded-lg bg-white overflow-hidden" style={{ height: '600px' }}>
          <ForceGraph2D
            graphData={graph}
            width={containerRef.current?.clientWidth || 800}
            height={600}
            nodeLabel={(node) => `${node.label}: ${node.name || node.id}`}
            nodeColor={(node) => NODE_COLORS[node.label] || '#999'}
            nodeVal={5}
            linkLabel={(link) => link.type}
            linkColor={() => 'rgba(150,150,150,0.4)'}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkWidth={1}
            cooldownTicks={100}
          />
        </div>
      )}
    </div>
  )
}