import { useEffect, useState } from 'react'
import { MapContainer, GeoJSON } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import styles from './App.module.css'
import initialStatesData from './data/states-data.json'

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

type StateStatus = 'positive' | 'negative' | 'mixed' | 'unknown'

interface StateInfo {
  name: string
  status: StateStatus
  summary: string
  lastUpdated: string
}

interface GeoJSONFeature {
  type: string
  properties: {
    NAME: string
    STUSPS: string
  }
  geometry: any
}

function App() {
  const [geoJsonData, setGeoJsonData] = useState<any>(null)
  const [statesInfo, setStatesInfo] = useState<Record<string, StateInfo>>(initialStatesData as Record<string, StateInfo>)
  const [selectedState, setSelectedState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState<'map' | 'data'>('map')
  const [error, setError] = useState<string | null>(null)

  // Fetch GeoJSON data
  useEffect(() => {
    const loadMapData = async () => {
      try {
        setLoadingPhase('map')
        const response = await fetch('/us-states.json')
        if (!response.ok) throw new Error('Failed to load map data')
        
        const data = await response.json()
        setGeoJsonData(data)
        
        // Simulate loading state data (in real app, this would be another fetch)
        setLoadingPhase('data')
        setTimeout(() => {
          setIsLoading(false)
        }, 500)
      } catch (err) {
        setError('Unable to load map data. Please try again.')
        setIsLoading(false)
      }
    }

    loadMapData()
  }, [])
  useEffect(() => {
    if (geoJsonData && geoJsonData.features && geoJsonData.features.length > 0) {
      console.log('First feature properties:', geoJsonData.features[0].properties)
    }
  }, [geoJsonData])

  // Get color based on state status
  const getStateColor = (stateCode: string): string => {
    const status = statesInfo[stateCode]?.status || 'unknown'
    switch (status) {
      case 'positive': return '#10b981'
      case 'negative': return '#ef4444'
      case 'mixed': return '#f59e0b'
      default: return '#6b7280'
    }
  }

  // Style function for GeoJSON features
  const styleFeature = (feature: GeoJSONFeature | undefined) => {
    if (!feature) return {}
    const stateCode = feature.properties.STUSPS
    return {
      fillColor: getStateColor(stateCode),
      weight: 1,
      opacity: 1,
      color: 'white',
      fillOpacity: selectedState === stateCode ? 0.9 : 0.7
    }
  }

  // Handle feature interactions
// In the onEachFeature function, add:
const onEachFeature = (feature: GeoJSONFeature, layer: L.Layer) => {
  const stateCode = feature.properties.STUSPS
  console.log('State found:', stateCode, feature.properties.NAME) // ADD THIS
  
  layer.on({
    click: () => {
      console.log('State clicked:', stateCode) // ADD THIS
      if (selectedState === stateCode) {
        setSelectedState(null)
      } else {
        setSelectedState(stateCode)
      }
    },
      mouseover: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path
        target.setStyle({
          fillOpacity: 0.9
        })
      },
      mouseout: (e: L.LeafletMouseEvent) => {
        const target = e.target as L.Path
        target.setStyle({
          fillOpacity: selectedState === stateCode ? 0.9 : 0.7
        })
      }
    })
  }

  // Handle retry
  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }

  // Render loading state
  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p className={styles.loadingText}>
            {loadingPhase === 'map' ? 'Loading map...' : 'Loading state information...'}
          </p>
        </div>
      </div>
    )
  }

  // Render error state
  if (error || !geoJsonData) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>{error || 'Unable to load map data'}</p>
          <button className={styles.retryButton} onClick={handleRetry}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const selectedStateInfo = selectedState ? statesInfo[selectedState] : null

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <h1 className={styles.title}>US Trans Rights Tracker</h1>
        <p className={styles.subtitle}>Click any state for details</p>
      </header>

      {/* Map */}
      <div className={styles.mapWrapper}>
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
          zoomControl={true}
        >
          <GeoJSON
            data={geoJsonData}
            style={styleFeature}
            onEachFeature={onEachFeature}
          />
        </MapContainer>
      </div>

      {/* Legend */}
      <div className={styles.legend}>
        <h3 className={styles.legendTitle}>Legend</h3>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#10b981' }} />
          <span className={styles.legendLabel}>Positive</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#ef4444' }} />
          <span className={styles.legendLabel}>Negative</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#f59e0b' }} />
          <span className={styles.legendLabel}>Mixed</span>
        </div>
        <div className={styles.legendItem}>
          <div className={styles.legendColor} style={{ backgroundColor: '#6b7280' }} />
          <span className={styles.legendLabel}>Unknown</span>
        </div>
      </div>

      {/* State Info Panel */}
      {selectedStateInfo && (
        <div 
          className={styles.infoPanel}
          onClick={() => setSelectedState(null)}
        >
          <div className={styles.infoPanelContent}>
            <h2 className={styles.stateName}>{selectedStateInfo.name}</h2>
            <span className={`${styles.statusBadge} ${styles[`status${selectedStateInfo.status.charAt(0).toUpperCase() + selectedStateInfo.status.slice(1)}`]}`}>
              {selectedStateInfo.status}
            </span>
            <p className={styles.summary}>{selectedStateInfo.summary}</p>
            <p className={styles.lastUpdated}>
              Last updated: {new Date(selectedStateInfo.lastUpdated).toLocaleDateString()}
            </p>
            <p className={styles.closeHint}>Click anywhere to close</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default App