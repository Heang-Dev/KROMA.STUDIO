---
title: ម៉ាស៊ីនសំឡេង
group: សំឡេង
section: 3
order: 2
---
សំឡេងរចនា និងសំឡេងចម្លង មកពី **ម៉ាស៊ីន Khmer Voice Studio** (VoxCPM2)។ សំឡេងរហ័សមិនត្រូវការវាទេ។

## នៅលើ GPU ឥតគិតថ្លៃរបស់ Google Colab (លឿន)

1. បើក `KHMER.VOICE.STUDIO/engine/colab/KhmerVoiceStudio_Colab.ipynb` ក្នុង Google Colab។
2. ជ្រើស GPU T4 ហើយដំណើរការក្រឡាទាំងអស់។
3. បិទភ្ជាប់អាសយដ្ឋាន និង token ដែលវាបង្ហាញ ទៅក្នុង **Settings → Voice Engine**។

## នៅលើកុំព្យូទ័ររបស់អ្នក (យឺតជាង)

នៅក្នុងថត Khmer Voice Studio៖

```bash
make engine
```

លើកដំបូងវាទាញយកម៉ូដែលសំឡេង (ប្រហែល 5 GB)។ Kroma ភ្ជាប់ទៅ `http://127.0.0.1:7861`។

## ស្ថានភាព

**Settings → Voice Engine → Check** បង្ហាញថាម៉ាស៊ីនអាចភ្ជាប់បានឬទេ និងមានសំឡេងប៉ុន្មាន។ បើផ្ទាំង Voice បង្ហាញថាម៉ាស៊ីនមិនអាចភ្ជាប់បាន សូមចាប់ផ្តើមវា ឬប្រើសំឡេងរហ័ស។
