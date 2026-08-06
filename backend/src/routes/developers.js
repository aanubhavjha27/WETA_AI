import express from 'express'
import {
   getRecommendations, 
   
  getDeveloperProfile,
  getGraphSnapshot,
  listDevelopers
} from '../controllers/developerscontroller.js'

const router = express.Router()
router.get('/developers', listDevelopers)  
             // must come before :username routes
router.get('/developers/:username/recommendations', getRecommendations)

router.get('/developers/:username',getDeveloperProfile)
router.get('/graph',getGraphSnapshot)
export default router