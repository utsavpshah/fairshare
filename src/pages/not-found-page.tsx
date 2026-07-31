import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Page not found</CardTitle>
          <CardDescription>The route you requested does not exist in this build.</CardDescription>
        </CardHeader>
        <CardContent>
          <Link to="/app">
            <Button>Return to dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
