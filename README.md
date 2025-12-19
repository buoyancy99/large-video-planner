<div align="center">

# Large Video Planner Enables Generalizable Robot Control

This repo provides training and inference code for the paper "Large Video Planner Enables Generalizable Robot Control"

[Paper](http://arxiv.org/abs/2512.15840) &nbsp;
[Project Webpage](https://www.boyuan.space/large-video-planner/) &nbsp;
[Hugging Face Demo](https://huggingface.co/spaces/KempnerInstituteAI/LVP)


</div>


# Downloading the dataset
Download all the metadata file for eight filtered dataset, and our third-party collected test set:
```bash
huggingface-cli download KempnerInstituteAI/LVP \
    --include "data/**" \
    --local-dir . \
    --local-dir-use-symlinks False
```
This will download each data folder under `data/`. 

# Downloading the checkpoints

Please put all downloaded checkpoints within `data/ckpts`

## Downloading Our Fine-tuned Checkpoints

```bash
huggingface-cli download KempnerInstituteAI/LVP \
    --include "checkpoints/**" \
    --local-dir . \
    --local-dir-use-symlinks False

mv checkpoints data/ckpts
```
This will take 66 GB disk space, be careful. 

After downloading the trained checkpoints should be in path: `data/ckpts/lvp_14B.ckpt`.
This path is specified in `configurations/algorithm/wan_i2v.yaml`


## Downloading Wan 2.1 Pre-trained Checkpoints

This codebase uses the **Wan 2.1 Image-to-Video (I2V) 14B** model for video generation. The checkpoint includes:
- Wan2.1 diffusion model weights (14B parameters), from which we finetuned on.
- VAE encoder/decoder
- T5 text encoder (UMT5-XXL)
- CLIP image encoder (XLM-Roberta-Large-ViT-Huge)

**Official Download Instructions**: Please refer to the [Wan 2.1 GitHub repository](https://github.com/Wan-Video/Wan2.1#model-download) for the most up-to-date checkpoint download instructions.

**Quick Download** (using Hugging Face CLI):
```bash
# Download Wan 2.1 I2V 14B 480P (recommended for this codebase)
huggingface-cli download Wan-AI/Wan2.1-I2V-14B-480P --local-dir ./data/ckpts/Wan2.1-I2V-14B-480P
```

The checkpoint will be downloaded to `./data/ckpts/Wan2.1-I2V-14B-480P/` and automatically includes all necessary components (VAE, T5, CLIP, main model).

**Note**: The 480P model is used in our training pipeline. The checkpoint path is configured in [configurations/algorithm/wan_i2v.yaml](configurations/algorithm/wan_i2v.yaml).




# Instructions for running the code

This document provides detailed instructions for running inference and training with the EI World Model codebase.

## Table of Contents
- [Environment Setup](#environment-setup)
- [How to Run Inference](#how-to-run-inference)
- [How to Run Training](#how-to-run-training)

---

## Environment Setup

### Prerequisites
- Python 3.10
- CUDA 12.1+ (for GPU support)
- Conda or Mamba package manager

### Step 1: Create Conda Environment

```bash
# using conda
conda create python=3.10 -n ei_world_model
conda activate ei_world_model
```

### Step 2: Install Dependencies

We store python dependencies in **`requirements.txt`**

```bash
# Install core dependencies
pip install -r requirements.txt


# Install Flash Attention (for efficient attention)
# This may take several minutes to compile
pip install flash-attn --no-build-isolation
```

**Note**: If you encounter issues with `flash-attn`, you can skip it for inference-only usage. It's primarily needed for efficient training.

### Step 3: Configure WandB (Weights & Biases)

WandB is used for experiment tracking and logging.

```bash
# Login to WandB
wandb login

# Or set your API key
export WANDB_API_KEY=your_api_key_here
```

Update your WandB entity in [configurations/config.yaml](configurations/config.yaml):

```yaml
wandb:
  entity: your-wandb-username  # Change this to your WandB username or org
  project: ei_world_model
  mode: online  # Use 'offline' for no internet, 'dryrun' for testing
```

Note we set wandb to offline by default, so you can go through other part of the code without setting wandb first.

### Step 4: Verify Installation

Test your installation with a quick inference run:

```bash
# Test with toy model (no checkpoints needed)
python -m main \
  +name=test_installation \
  experiment=exp_video \
  algorithm=wan_toy \
  dataset=dummy \
  experiment.tasks=[validation] \
  experiment.validation.limit_batch=1
```

If this runs without errors, your environment is set up correctly!

### Environment Variables

For distributed training on SLURM clusters, you may need to set:

```bash
# For offline compute nodes with WandB sync
export WANDB_MODE=offline
export WANDB_DIR=/path/to/wandb/logs

# For debugging
export HYDRA_FULL_ERROR=1
export CUDA_LAUNCH_BLOCKING=1
```

### Troubleshooting

**Issue: CUDA out of memory**
- Reduce batch size in experiment config: `experiment.training.batch_size=1`
- Enable gradient checkpointing: `algorithm.gradient_checkpointing_rate=1.0`


---

## How to Run Inference

Inference generates videos given an image and a text prompt using a pretrained model. 

### Basic Inference Command

```bash
mkdir -p <your-output-folder>
python -m main \
  +name=<your_exp_name> \
  experiment=exp_video \
  algorithm=wan_i2v \
  dataset=ours_test \
  experiment.tasks=[validation] \
  algorithm.logging.video_type=single \
  experiment.num_nodes=1 \
  experiment.validation.limit_batch=null \
  algorithm.hist_guidance=1.5 \
  algorithm.lang_guidance=2.5
```

### Command Arguments Explained

#### Required Arguments
- **`+name=<your_exp_name>`**: Unique experiment name for this run. Used for logging and organizing outputs in WandB and file system.

#### Core Configuration
- **`experiment=exp_video`**: Specifies the experiment type
  - Points to: [configurations/experiment/exp_video.yaml](configurations/experiment/exp_video.yaml)
  - Defines: Training/validation settings, tasks, precision, batch size

- **`algorithm=wan_i2v`**: Selects the Wan 2.1 Image-to-Video model
  - Points to: [configurations/algorithm/wan_i2v.yaml](configurations/algorithm/wan_i2v.yaml)
  - Inherits from: [wan_t2v.yaml](configurations/algorithm/wan_t2v.yaml) 
  - **You need to set checkpoint path in these two yaml files**

- **`dataset=ours_test`**: Specifies evaluation dataset
  - Should point to: `configurations/dataset/ours_test.yaml`
  - Format: CSV with metadata (video_path, caption, height, width, fps, n_frames)
  - The specific CSV format is disscused in dataset/README.md

#### Task Configuration
- **`experiment.tasks=[validation]`**: Runs validation/inference mode
  - Executes the `validation()` method in [experiments/exp_video.py](experiments/exp_video.py)

#### Cluster Configuration
- **`cluster=fast_high`**: SLURM cluster settings we used for evaluation
  - Points to: [configurations/cluster/phase3_eval.yaml](configurations/cluster/fas_high.yaml)
  - Settings: 4 H100 GPUs, 48 CPUs, 512GB memory, 1-day time limit

- **`experiment.num_nodes=1`**: Number of compute nodes (1 for inference)

#### Inference Parameters
- **`experiment.validation.limit_batch=null`**: Process all batches
  - Set to a number (e.g., `10`) to limit evaluation to N batches for quick testing

- **`algorithm.hist_guidance=1.5`**: Historical guidance scale for conditioning on previous frames
  - Controls how strongly the model follows the input image
  - Range: 0.0 (no guidance) to 3.0+ (strong guidance)
  - Recommend: 1.5

- **`algorithm.lang_guidance=2.5`**: Language guidance scale (classifier-free guidance)
  - Controls how strongly the model follows the text prompt
  - Range: 0.0 (no guidance) to 5.0+ (strong guidance)
  - Recommend: 2.0, 2.5

#### Logging Configuration
- **`algorithm.logging.video_type=single`**: Save videos individually
  - Alternative: `grid` - saves all videos in a grid layout

---

## How to Run Training

Training fine-tunes the Wan 2.1 models on custom video datasets.

### Full-Scale Training Command

```bash
python -m main \
  +name=final_i2v \
  experiment=exp_video \
  algorithm=wan_i2v \
  dataset=mixture \
  experiment.num_nodes=32 \
  algorithm.lang_guidance=0 \
  algorithm.hist_guidance=0 \
  experiment.validation.val_every_n_step=100000000
```

### Debug Training Command (Toy Model)

For rapid iteration and debugging, use a smaller toy model:

```bash
python -m main \
  +name=print_dataset_mix_debug_train \
  experiment=exp_video \
  algorithm=wan_toy \
  dataset=mixture \
  experiment.num_nodes=1 \
  algorithm.lang_guidance=0 \
  algorithm.hist_guidance=0 \
  experiment.validation.val_every_n_step=100000000
```

### Training Arguments Explained

#### Required Arguments
- **`+name=final_i2v`**: Experiment name for WandB logging and checkpoints

#### Core Configuration
- **`experiment=<your exp-name>`**: Same as inference
  - Default task: `[training]` (defined in [exp_video.yaml](configurations/experiment/exp_video.yaml))

- **`algorithm=wan_i2v`** or **`algorithm=wan_toy`**:
  - `wan_i2v`: Full 14B parameter model ([wan_i2v.yaml](configurations/algorithm/wan_i2v.yaml))
  - `wan_toy`: Tiny model for debugging ([wan_toy.yaml](configurations/algorithm/wan_toy.yaml))
    - Only 2 layers, 128 dimensions (vs 40 layers, 5120 dimensions)
    - No checkpoint loading required

- **`dataset=mixture`**: Combined dataset of multiple sources
  - Points to: [configurations/dataset/mixture.yaml](configurations/dataset/mixture.yaml)
  - Includes: Pandas, Epic Kitchen, Ego4D, DROID, Something-Something, Bridge, AgibotWorld, Language Table
  - Weighted mixture based on dataset sizes and importance

#### Cluster Configuration
- **`cluster=phase3`**: Training cluster settings we used
  - Points to: [configurations/cluster/phase3.yaml](configurations/cluster/phase3.yaml)
  - Settings: 4 H100 GPUs per node, 32 node, priority queue, 14-day time limit

- **`experiment.num_nodes=32`**: Multi-node distributed training
  - 32 nodes × 4 GPUs = 128 GPUs for full training
  - Set to `1` for debugging with toy model

### Configuration System (Hydra)

The codebase uses Hydra for hierarchical configuration management:

1. **Base Config**: [configurations/config.yaml](configurations/config.yaml)
   - Specifies defaults: experiment, dataset, algorithm, cluster
   - WandB settings for logging

2. **Config Composition**: Hydra composes configs from multiple YAML files
   - Command-line overrides: `algorithm.lang_guidance=2.5`
   - Inheritance: `wan_i2v.yaml` inherits from `wan_t2v.yaml`

3. **Config Resolution**: [main.py](main.py) resolves all configs and passes to experiment

### Execution Flow

1. **Entry**: `python -m main +name=... experiment=... algorithm=... dataset=...`
2. **Hydra Setup**: [main.py](main.py) loads and merges all configs
3. **Experiment Creation**: [experiments/exp_video.py](experiments/exp_video.py) builds experiment
4. **Task Execution**: Calls `experiment.exec_task(task)` for each task in `experiment.tasks`
   - Training: Sets up dataloaders, trainer, and runs training loop
   - Validation: Loads model, generates videos, saves outputs
