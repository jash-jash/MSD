import React from 'react'
import { motion } from 'framer-motion'

export default function Glass({ children, className = '', style, onClick }) {
  return (
    <motion.div
      whileHover={{ translateY: -2 }}
      whileTap={{ translateY: 0.5 }}
      className={`glass ${className}`}
      style={style}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
