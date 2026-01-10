# Research: Dream Stream MVP

**Feature Branch**: `001-mvp`  
**Date**: 2025-01-10  
**Status**: Complete

## Executive Summary

This document captures technology decisions for Dream Stream MVP based on research into cross-platform frameworks, backend infrastructure, and content formats.

---

## Decision 1: Cross-Platform Framework

### Decision: **Expo (React Native)**

### Rationale
Expo provides the fastest path to MVP while meeting all constitution requirements (60fps animations, cross-platform excellence, offline capability). The managed workflow eliminates DevOps overhead for a small team.

### Key Factors
- **Media Playback**: `expo-video` uses native AVPlayer (iOS) and ExoPlayer (Android) under the hood
- **Development Speed**: EAS (Expo Application Services) enables instant OTA updates without App Store review
- **Animation Performance**: Reanimated 3 runs animations on native thread, ensuring 60fps during UI interactions
- **Cross-Platform**: Single codebase for iOS, Android, and Web with native-feeling behavior

### Alternatives Considered

| Framework | Pros | Cons | Verdict |
|-----------|------|------|---------|
| Flutter | Pixel-perfect consistency, Impeller engine | Custom implementations for native behaviors (PiP, lock screen controls) | Good but slower for media MVP |
| React Native (Bare) | Full native control | Requires manual configuration, slower iteration | Overkill for MVP |
| Native (Swift/Kotlin) | Best performance | 2x development cost, separate codebases | Not feasible for MVP timeline |

### Technical Specifications
- **Framework Version**: Expo SDK 52+
- **Video Library**: `expo-video`
- **Animation**: `react-native-reanimated` v3
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Icons**: `lucide-react-native`

---

## Decision 2: Backend Stack

### Decision: **Supabase + Mux**

### Rationale
This "managed stack" approach reduces MVP timeline from 4-6 weeks to 1-2 weeks by eliminating custom authentication, API boilerplate, and video transcoding infrastructure.

### Key Factors
- **Time to MVP**: Auto-generated REST API from database schema
- **Authentication**: Built-in email/password with Row Level Security
- **Media Delivery**: Mux handles transcoding, adaptive bitrate, and global CDN
- **Scale**: Both services handle 1,000+ concurrent users without infrastructure tuning

### Alternatives Considered

| Stack | Time to MVP | Media Handling | Cost (MVP) | Verdict |
|-------|-------------|----------------|------------|---------|
| Node.js + Express | 4-6 weeks | Manual (ffmpeg/CDN) | $10-30/mo | Too slow for MVP |
| Python + FastAPI | 4-6 weeks | Manual | $10-30/mo | Good for ML, overkill here |
| Firebase | 2-3 weeks | Limited | $25/mo | Vendor lock-in concerns |
| **Supabase + Mux** | **1-2 weeks** | **Turnkey HLS/CDN** | **$25-100/mo** | **Selected** |

### Technical Specifications
- **Database**: Supabase (PostgreSQL)
- **API**: PostgREST (auto-generated from schema)
- **Auth**: Supabase Auth (email/password, magic links)
- **Media**: Mux (transcoding, HLS streaming, CDN)
- **Edge Functions**: Supabase Edge Functions (Deno/TypeScript)

### Cost Projection (MVP Scale)
- Supabase Pro: $25/month
- Mux: ~$70-100/month (1,000 users × 1hr content each)
- **Total**: ~$100-125/month

---

## Decision 3: Content Format

### Decision: **AI-Generated Cinematic Video (HLS Streaming)**

### Rationale
Video provides the highest immersion for a "Netflix for dreams" concept. AI generation solves the content production bottleneck for MVP, allowing rapid iteration without hiring animators or film crews.

### Key Factors
- **User Engagement**: High-definition surreal video captures dream-like quality
- **Netflix Alignment**: Video-centric format matches user expectations
- **Production Feasibility**: AI tools (Luma, Runway) enable rapid content seeding
- **Technical Simplicity**: HLS is a solved problem with native platform support

### Content Specifications

| Aspect | Specification |
|--------|--------------|
| Container | HLS (.m3u8) with multiple bitrates |
| Video Codec | H.264 (AVC) for compatibility |
| Audio Codec | AAC 256kbps, optional binaural/spatial audio |
| Resolutions | 360p, 720p, 1080p adaptive |
| Duration | 15-60 second "dream loops" for MVP |
| Accessibility | WebVTT captions, audio descriptions track |

### Alternatives Considered

| Format | Immersion | Complexity | Verdict |
|--------|-----------|------------|---------|
| Audio-only + visualizer | Medium | Low | Good for "lite" mode later |
| Interactive WebGL | Very High | Very High | Too complex for MVP |
| Slideshow + narration | Low | Very Low | Fails immersion requirement |
| **AI Video + HLS** | **High** | **Medium** | **Selected** |

### Content Seeding Strategy (MVP)
1. Generate 20-30 dream videos using Luma Dream Machine API
2. Process with FFmpeg into HLS segments (360p/720p/1080p)
3. Layer ambient binaural audio tracks
4. Store metadata in Supabase, media in Mux

---

## Technology Stack Summary

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Expo (React Native) + expo-video + NativeWind              │
│  iOS • Android • Web                                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                         BACKEND                              │
│  Supabase (PostgreSQL + Auth + Edge Functions)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     MEDIA DELIVERY                           │
│  Mux (Transcoding + HLS + CDN)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Constitution Compliance Assessment

| Principle | Stack Support |
|-----------|--------------|
| I. Intuitive Experience | Expo enables native-feeling interactions, no learning curve |
| II. Seamless Functionality | Supabase real-time sync, Mux adaptive streaming |
| III. Beautiful Interfaces | NativeWind + Reanimated for consistent design system |
| IV. Cross-Platform Excellence | Single codebase, native platform conventions via Expo |
| V. Effortless Usability | Video playback in 1 tap, favorites in 1 tap |
| VI. Unwavering Stability | Managed services with 99.9% SLA, Jest testing built-in |

---

## Open Items for Implementation

1. **Content Generation Pipeline**: Set up Luma API integration for dream video generation
2. **Design System**: Create NativeWind theme tokens (colors, spacing, typography)
3. **Mux Integration**: Configure upload workflow and player SDK
4. **Offline Support**: Implement expo-file-system caching strategy
