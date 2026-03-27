import { ModelConfig, ModelResult, MultiModelAnalysis } from '../config/models';

export type { ModelResult, MultiModelAnalysis };
export interface ModelServiceInterface {
  analyzeWithAllModels(audioFile: File): Promise<MultiModelAnalysis>;
  updateModelConfig(modelId: string, updates: Partial<ModelConfig>): void;
  getModelConfigs(): ModelConfig[];
  checkAllModelConnections(): Promise<{ modelId: string; connected: boolean }[]>;
}

class ModelService implements ModelServiceInterface {
  private configs: ModelConfig[];

  constructor() {
    // In production, these could come from environment variables
    this.configs = [
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
  }

  async analyzeWithAllModels(audioFile: File): Promise<MultiModelAnalysis> {
    const startTime = Date.now();
    const activeConfigs = this.configs.filter(config => config.isActive);
    
    // Create promises for all active models
    const modelPromises = activeConfigs.map(async (config) => {
      const modelStartTime = Date.now();
      try {
        const formData = new FormData();
        formData.append('file', audioFile);

        const response = await fetch(`${config.url}/analyze`, {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        const responseTime = Date.now() - modelStartTime;

        return {
          modelId: config.id,
          modelName: config.name,
          prediction: data.prediction?.prediction || 'unknown',
          confidence: data.prediction?.confidence || 0,
          fake_probability: data.prediction?.fake_probability || 0,
          real_probability: data.prediction?.real_probability || 0,
          is_deepfake: data.prediction?.is_deepfake || false,
          heatmap_image: data.heatmap?.heatmap_image,
          response_time: responseTime
        } as ModelResult;
      } catch (error) {
        const responseTime = Date.now() - modelStartTime;
        return {
          modelId: config.id,
          modelName: config.name,
          prediction: 'error',
          confidence: 0,
          fake_probability: 0,
          real_probability: 0,
          is_deepfake: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          response_time: responseTime
        } as ModelResult;
      }
    });

    // Wait for all models to complete
    const results = await Promise.all(modelPromises);
    const totalTime = Date.now() - startTime;

    // Calculate consensus
    const consensus = this.calculateConsensus(results);

    return {
      audioFile,
      results,
      consensus,
      analysis_time: totalTime
    };
  }

  private calculateConsensus(results: ModelResult[]) {
    const validResults = results.filter(r => !r.error && r.prediction !== 'error');
    
    if (validResults.length === 0) {
      return {
        prediction: 'error',
        confidence: 0,
        agreement_count: 0,
        total_models: results.length
      };
    }

    // Count predictions
    const fakeCount = validResults.filter(r => r.is_deepfake).length;
    const realCount = validResults.filter(r => !r.is_deepfake).length;
    
    // Determine consensus prediction
    const consensusPrediction = fakeCount > realCount ? 'fake' : 'real';
    const agreementCount = Math.max(fakeCount, realCount);
    
    // Calculate average confidence for consensus prediction
    const consensusResults = validResults.filter(r => 
      (consensusPrediction === 'fake' && r.is_deepfake) || 
      (consensusPrediction === 'real' && !r.is_deepfake)
    );
    
    const avgConfidence = consensusResults.length > 0 
      ? consensusResults.reduce((sum, r) => sum + r.confidence, 0) / consensusResults.length
      : 0;

    return {
      prediction: consensusPrediction,
      confidence: avgConfidence,
      agreement_count: agreementCount,
      total_models: results.length
    };
  }

  updateModelConfig(modelId: string, updates: Partial<ModelConfig>) {
    const configIndex = this.configs.findIndex(c => c.id === modelId);
    if (configIndex !== -1) {
      this.configs[configIndex] = { ...this.configs[configIndex], ...updates };
    }
  }

  getModelConfigs(): ModelConfig[] {
    return this.configs;
  }

  async testModelConnection(config: ModelConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async checkAllModelConnections(): Promise<{ modelId: string; connected: boolean }[]> {
    const connectionPromises = this.configs.map(async (config) => ({
      modelId: config.id,
      connected: await this.testModelConnection(config)
    }));

    return Promise.all(connectionPromises);
  }
}

export const modelService = new ModelService();
