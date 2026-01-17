#!/bin/bash

# Update Header.tsx
sed -i "s/export type TabType = 'morning' | 'toddler' | 'primary' | 'quote';/export type TabType = 'morning' | 'toddler' | 'primary' | 'quote' | 'picturebook';/" src/components/Header.tsx
sed -i 's/grid-cols-4/grid-cols-5/' src/components/Header.tsx  
sed -i 's/max-w-5xl/max-w-6xl/' src/components/Header.tsx
sed -i 's/px-20/px-12/g' src/components/Header.tsx

echo "Header.tsx updated"
