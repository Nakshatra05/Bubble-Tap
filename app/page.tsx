"use client"

import BubbleTapGame from "@/components/game"
import Navbar from "@/components/navbar"
import { usePrivy } from "@privy-io/react-auth";

export default function Page() {

  

  

  const items = [
    { id: 'home', name: 'Home', resource: 'home' },
    { id: 'settings', name: 'Settings', resource: 'settings' },
  ]


  return <><Navbar  />
  <BubbleTapGame />
  </>
}
