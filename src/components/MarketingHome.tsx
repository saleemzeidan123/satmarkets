"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mark, Logo, Icon, Ph, Verified, HARBOR, COOL } from "@/components/satkit";
import Reveal from "@/components/Reveal";
// Finding 173's defect repeated here: this heart used to be `Icon.heart` with
// no handler, on the first screen of the site. `SaveHeart` is the one working
// implementation (src/components/SaveHeart.tsx, already load-bearing on
// ListingCard and the saved-spaces page); the front door now calls it instead
// of drawing its own decorative copy.
import SaveHeart from "@/components/SaveHeart";
import { getDictionary } from "@/i18n/getDictionary";
import { formatPeriod } from "@/lib/market/period";
// RC12, finding 164. The asset rail pages by animating a scroll, which the CSS
// reduced-motion block cannot reach while the behaviour is stated explicitly.
import { scrollBehavior } from "@/lib/motion";
// PKG-FIG2 closure, finding 132. Type only, so nothing server-side is pulled
// into the client bundle. The prop used to restate this shape by hand, which
// is how it came to say `stat: "average" | "median" | null` over a producer
// that can also answer "single", "count", "range", "rate" or "index". A second
// copy of a type is the same defect as a second copy of a unit table.
import type { PublishedKpis } from "@/lib/market/published";
import { fill, formatInteger, formatRange, formatUnit } from "@/lib/format";

PLACEHOLDER_TEST_ONLY_DO_NOT_USE