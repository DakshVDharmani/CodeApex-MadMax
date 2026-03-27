// Model configuration for multi-model deepfake detection
export interface ModelConfig {
  id: string;
  name: string;
  url: string;
  description: string;
  color: string;
  isActive: boolean;
}

export const MODEL_CONFIGS: ModelConfig[] = [
  {
    id: 'model1',
    name: 'DeepFake Audio (KAGGLE)',
    url: 'http://localhost:8000',
    description: 'CNN trained on KAGGLE + DeepfakeAudios dataset',
    color: '#8B5CF6',
    isActive: true
  },
  {
    id: 'model2', 
    name: 'Advanced Audio Model',
    url: 'http://localhost:8001',
    description: 'CNN-LSTM hybrid with attention mechanism',
    color: '#3B82F6',
    isActive: true
  },
  {
    id: 'model3',
    name: 'Ensemble Model', 
    url: 'http://localhost:8002',
    description: 'Weighted ensemble of multiple architectures',
    color: '#10B981',
    isActive: true
  }
];

export interface ModelResult {
  modelId: string;
  modelName: string;
  prediction: string;
  confidence: number;
  fake_probability: number;
  real_probability: number;
  is_deepfake: boolean;
  heatmap_image?: string;
  error?: string;
  response_time?: number;
}

export interface MultiModelAnalysis {
  audioFile: File;
  results: ModelResult[];
  consensus: {
    prediction: string;
    confidence: number;
    agreement_count: number;
    total_models: number;
  };
  analysis_time: number;
}
