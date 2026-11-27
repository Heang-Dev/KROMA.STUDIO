---
title: ការដំឡើង
group: ចាប់ផ្តើម
section: 1
order: 1
---
Kroma Studio ជាកម្មវិធីកុំព្យូទ័រសម្រាប់ **macOS (Apple silicon)**, **Windows 10/11** និង **Linux (x64)**។ ទាញយកពី[ទំព័រទាញយក](/#download) ឬពី [GitHub Releases](https://github.com/Heang-Dev/kroma/releases/latest)។

## តម្រូវការប្រព័ន្ធ

| | អប្បបរមា |
|---|---|
| macOS | 13 ឬថ្មីជាងនេះ, Apple silicon (M1 និងថ្មីជាងនេះ) |
| Windows | 10 ឬ 11, 64-bit |
| Linux | x64; AppImage (គ្រប់ distro) ឬ .deb (Ubuntu, Debian) |
| ទំហំថាស | ប្រហែល 600 MB សម្រាប់កម្មវិធី និងកន្លែងសម្រាប់វីដេអូរបស់អ្នក |
| អ៊ីនធឺណិត | ត្រូវការសម្រាប់ទាញយកវីដេអូ និងសេវា AI |

អ្នកមិនត្រូវការកុំព្យូទ័រខ្លាំងទេ៖ ការបំប្លែងសំឡេងទៅជាអក្សរ ការបកប្រែ និងសំឡេងរហ័ស ដំណើរការលើ cloud។

## macOS

1. បើកឯកសារ `.dmg` ហើយអូស **Kroma Studio** ទៅក្នុង **Applications**។
2. កម្មវិធីនេះមិនទាន់មានហត្ថលេខាវិញ្ញាបនបត្ររបស់ Apple នៅឡើយទេ។ បើ macOS បង្ហាញថាវាខូច ឬមិនព្រមបើក សូមដំណើរការពាក្យបញ្ជានេះម្តងក្នុង Terminal៖

```bash
xattr -cr "/Applications/Kroma Studio.app"
```

3. ដំឡើងឧបករណ៍វីដេអូ ដោយប្រើ [Homebrew](https://brew.sh)៖

```bash
brew install ffmpeg yt-dlp
```

## Windows

ដំណើរការ `Kroma-Studio-Setup-<version>.exe`។ កម្មវិធីដំឡើងមិនទាន់មានហត្ថលេខាកូដនៅឡើយទេ៖ ពេលឃើញ **«Windows protected your PC»** ចុច **More info** រួចចុច **Run anyway**។ FFmpeg និង yt-dlp មកជាមួយកម្មវិធីស្រាប់។

## Linux

ធ្វើឱ្យ AppImage អាចដំណើរការបាន ហើយបើកវា ឬដំឡើងកញ្ចប់ `.deb`៖

```bash
chmod +x Kroma-Studio-*.AppImage && ./Kroma-Studio-*.AppImage
```

FFmpeg និង yt-dlp មកជាមួយកម្មវិធីស្រាប់។

## ជម្រើស៖ ការដកសំឡេងនិយាយដើមចេញ

ការដកសំឡេងនិយាយដើមចេញពីវីដេអូ (ដោយរក្សាតន្ត្រី និងសំឡេងបរិយាកាស) ប្រើ [uv](https://docs.astral.sh/uv/)។ Settings → About បង្ហាញថាវាបានដំឡើងហើយឬនៅ និងពាក្យបញ្ជាសម្រាប់ប្រព័ន្ធរបស់អ្នក។

## បន្ទាប់

[បន្ថែម key របស់អ្នក](configuration) រួច[ធ្វើវីដេអូដំបូងរបស់អ្នក](first-video)។
